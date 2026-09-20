import type { Akce, Faze, Hrac, HracId, Kolo, Odmena, Role, Smenaz, Stav, Tym } from './types';
import { MAX_HRACU, MIN_HRACU, sestavaPro, velikostParty } from './rules';
import { rng, vyber, type Rng } from './random';
import { rozdatSeptandu } from './septanda';

export function prazdnyStav(): Stav {
  return {
    faze: 'satna',
    hraci: [],
    role: {},
    predak: null,
    pocetSaboteru: 0,
    limitSicht: 0,
    smenyNaKolo: 1,
    nastaveni: { septandaProSabotery: true, vrazdy: true },
    kolo: 0,
    aktualni: null,
    historie: [],
    vrazdaMinuleKolo: false,
    imunita: null,
    tmaPristiRady: false,
    vitez: null,
    duvodKonce: null,
    pauza: null,
    pripraveni: [],
    konecFaze: null,
    partie: null,
  };
}

// ---------------------------------------------------------------- dotazy

export const zivi = (s: Stav): Hrac[] => s.hraci.filter((h) => h.zivy);
export const stiny = (s: Stav): Hrac[] => s.hraci.filter((h) => !h.zivy);
export const ziviSaboteri = (s: Stav): Hrac[] => zivi(s).filter((h) => s.role[h.id] === 'saboter');
export const ziviPracanti = (s: Stav): Hrac[] => zivi(s).filter((h) => s.role[h.id] === 'pracant');
export const hrac = (s: Stav, id: HracId): Hrac | undefined => s.hraci.find((h) => h.id === id);
export const jmeno = (s: Stav, id: HracId): string => hrac(s, id)?.jmeno ?? '?';

export const posledniSmena = (k: Kolo): Smenaz | undefined => k.smeny[k.smeny.length - 1];

/** Vražda dvě kola po sobě nejde. Bez padlé odpolední směny není co si brát. */
export function dostupneOdmeny(s: Stav): Odmena[] {
  const k = s.aktualni;
  const sm = k ? posledniSmena(k) : undefined;
  if (!sm?.padla) return [];
  if (!s.nastaveni.vrazdy) return ['imunita', 'tma'];
  return s.vrazdaMinuleKolo ? ['imunita', 'tma'] : ['vrazda', 'imunita', 'tma'];
}

/** Sabotovat smí jen sabotér. "Omylem jsem sabotoval" nesmí existovat. */
export function smiKazit(s: Stav, id: HracId): boolean {
  return s.role[id] === 'saboter';
}

/**
 * Kdo v téhle fázi musí něco odevzdat. Z toho se počítá pauza (chybí-li
 * někdo z nich) a to, jestli fáze může skončit dřív, než doběhne odpočet.
 */
export function kdoMaOdevzdat(s: Stav): HracId[] {
  const k = s.aktualni;
  switch (s.faze) {
    case 'rozdani':
      return s.hraci.map((h) => h.id);
    case 'sichta':
      return k ? posledniSmena(k)?.parta ?? [] : [];
    case 'nominace':
      return zivi(s).map((h) => h.id);
    case 'rada':
      return [...zivi(s), ...stiny(s).filter((h) => !h.hlasStinuUtracen)].map((h) => h.id);
    case 'noc':
      return zivi(s).map((h) => h.id);
    default:
      return [];
  }
}

/** Kdo už v téhle fázi odevzdal. Jen kdo, nikdy co. */
export function kdoOdevzdal(s: Stav): HracId[] {
  if (s.faze === 'rozdani') return s.pripraveni;
  const k = s.aktualni;
  if (!k) return [];
  switch (s.faze) {
    case 'sichta': {
      const sm = posledniSmena(k);
      return sm ? sm.parta.filter((id) => sm.volby[id] != null) : [];
    }
    case 'nominace':
      // kdo se rozhodl nenominovat, taky odevzdal: stůl na něj nemá čekat
      return [...Object.keys(k.nominace), ...k.beznominace];
    case 'rada':
      return [...Object.keys(k.hlasy), ...Object.keys(k.hlasyStinu), ...k.zdrzeliSe];
    case 'noc': {
      // Předák odevzdal, jakmile má odměnu a u vraždy i oběť. Musí být
      // v seznamu jako každý jiný, jinak by ho soupiska prozradila.
      const predakHotov = k.odmena != null && (k.odmena !== 'vrazda' || k.obet != null);
      return [
        ...Object.keys(k.podezreli),
        ...Object.keys(k.navrhyObeti),
        ...(predakHotov && s.predak ? [s.predak] : []),
      ];
    }
    default:
      return [];
  }
}

/**
 * Může fáze skončit dřív, než doběhne odpočet? Jen když odevzdali všichni,
 * na které se čeká. Odpojení, bez kterých se hraje, se nepočítají.
 */
export function fazeHotova(s: Stav): boolean {
  const ceka = kdoMaOdevzdat(s).filter((id) => {
    const h = hrac(s, id);
    return h && (h.pripojeny || !h.bezNej);
  });
  if (ceka.length === 0) return false;
  const hotovi = new Set(kdoOdevzdal(s));
  return ceka.every((id) => hotovi.has(id));
}

// ---------------------------------------------------------------- pauza

/**
 * Pauza jen tam, kde od odpojeného hráče něco čekáme. V rozpravě nebo
 * u výsledku šichty se nic neodevzdává, takže se nečeká: kdo se vrátí,
 * pokračuje. Hraje-li se bez něj (`bezNej`), nečeká se nikdy.
 */
function spocitatPauzu(s: Stav): Stav['pauza'] {
  if (s.faze === 'satna' || s.faze === 'konec') return null;
  const hotovi = new Set(kdoOdevzdal(s));
  const chybi = kdoMaOdevzdat(s)
    .map((id) => hrac(s, id))
    .find((h) => h && !h.pripojeny && !h.bezNej && !hotovi.has(h.id));
  if (!chybi) return null;
  // Pauzu, která už běží kvůli témuž hráči, nepřepisujeme, ať jí zůstane čas.
  if (s.pauza && s.pauza.kvuli === chybi.id) return s.pauza;
  return { duvod: 'vypadlo spojení', kvuli: chybi.id, od: null, zbyva: null };
}

// ---------------------------------------------------------------- konec hry

function vyhodnotitKonec(s: Stav): { vitez: Tym; duvod: string } | null {
  if (ziviSaboteri(s).length === 0) {
    return { vitez: 'pracanti', duvod: 'Poslední sabotér je pryč.' };
  }
  if (ziviPracanti(s).length === 0) {
    return { vitez: 'saboteri', duvod: 'U stolu nezůstal ani jeden pracant.' };
  }
  if (s.kolo > s.limitSicht) {
    const n = ziviSaboteri(s).length;
    return {
      vitez: 'saboteri',
      duvod: n === 1 ? 'Došly šichty a jeden sabotér je pořád ve směně.' : `Došly šichty a ${n} sabotéři jsou pořád ve směně.`,
    };
  }
  return null;
}

function mozneUkoncit(s: Stav): Stav {
  const konec = vyhodnotitKonec(s);
  if (!konec) return s;
  return { ...s, faze: 'konec', vitez: konec.vitez, duvodKonce: konec.duvod };
}

// ---------------------------------------------------------------- kolo

export function noveKolo(cislo: number): Kolo {
  return {
    cislo,
    smeny: [],
    pravdy: [],
    septanda: {},
    chtejiDal: [],
    beznominace: [],
    zdrzeliSe: [],
    nominace: {},
    kandidati: [],
    mluvi: 0,
    imunni: null,
    tma: false,
    hlasy: {},
    hlasyStinu: {},
    vyhosteny: null,
    odmena: null,
    navrhyObeti: {},
    obet: null,
    podezreli: {},
  };
}

function rozdatPartu(s: Stav, r: Rng): Smenaz {
  const zivych = zivi(s).map((h) => h.id);
  const smena = s.aktualni && s.aktualni.smeny.length === 0 && s.smenyNaKolo === 2 ? 'dopoledni' : 'odpoledni';
  return {
    smena,
    parta: vyber(zivych, velikostParty(zivych.length), r),
    volby: {},
    sabotazi: null,
    padla: null,
  };
}

function vyhodnotitSmenu(sm: Smenaz): Smenaz {
  const sabotazi = sm.parta.filter((id) => sm.volby[id] === 'kazit').length;
  return { ...sm, sabotazi, padla: sabotazi > 0 };
}

/**
 * Hráč odchází od stolu. Když to byl předák, funkce přejde na dalšího
 * živého sabotéra v pořadí sedadel. Stůl se to nedozví, sabotéři ano.
 */
function odebrat(s: Stav, id: HracId): Stav {
  const hraci = s.hraci.map((h) => (h.id === id ? { ...h, zivy: false } : h));
  const dalsi: Stav = { ...s, hraci };
  if (s.predak !== id) return dalsi;
  const nastupce = ziviSaboteri(dalsi).find((h) => h.id !== id);
  return { ...dalsi, predak: nastupce?.id ?? null };
}

/** Jedinečná přezdívka. Dva MISTŘI by rozbili každou soupisku u stolu. */
function jedinecneJmeno(s: Stav, navrh: string): string {
  const zaklad = navrh.trim().slice(0, 12) || 'Bezejmenný';
  const obsazena = new Set(s.hraci.map((h) => h.jmeno.toLowerCase()));
  if (!obsazena.has(zaklad.toLowerCase())) return zaklad;
  for (let n = 2; n < 100; n++) {
    const pripona = ` ${n}`;
    const kandidat = zaklad.slice(0, 12 - pripona.length) + pripona;
    if (!obsazena.has(kandidat.toLowerCase())) return kandidat;
  }
  return zaklad;
}

/** Bez zakladatele místnost nikdo nespustí. Přejde na prvního připojeného. */
function zajistitZakladatele(hraci: Hrac[]): Hrac[] {
  if (hraci.some((h) => h.zakladatel && h.pripojeny)) return hraci;
  const novy = hraci.find((h) => h.pripojeny) ?? hraci[0];
  if (!novy) return hraci;
  return hraci.map((h) => ({ ...h, zakladatel: h.id === novy.id }));
}

// ---------------------------------------------------------------- přechody

function poVysledku(s: Stav, r: Rng): Stav {
  const k = s.aktualni!;
  const jeDopoledni = posledniSmena(k)?.smena === 'dopoledni';
  if (jeDopoledni) {
    // po dopolední jde rovnou další zadání, odpolední teprve odemyká vraždu
    return { ...s, faze: 'zadani', aktualni: { ...k, smeny: [...k.smeny, rozdatPartu(s, r)] } };
  }
  const neceProslo = k.smeny.some((sm) => sm.padla === false);
  if (!neceProslo) return { ...s, faze: 'rozprava' };

  const septanda = rozdatSeptandu(
    {
      role: s.role,
      jmeno: (id) => jmeno(s, id),
      predak: s.predak,
      zivi: zivi(s).map((h) => h.id),
      pocetHracu: s.hraci.length,
      // Jen dokončená kola: tohle kolo ještě nemá nominace ani hlasy.
      historie: s.historie,
      smeny: k.smeny,
      kolo: k.cislo,
      proSabotery: s.nastaveni.septandaProSabotery,
    },
    r,
  );
  if (Object.keys(septanda.vety).length === 0) return { ...s, faze: 'rozprava' };
  return { ...s, faze: 'septanda', aktualni: { ...k, septanda: septanda.vety, pravdy: septanda.pravdy } };
}

/** Kolik nominací kdo dostal. Imunní se do rady nedostane, ale počet se mu ukáže. */
export function spocitatNominace(k: Kolo): Map<HracId, number> {
  const pocty = new Map<HracId, number>();
  for (const cil of Object.values(k.nominace)) pocty.set(cil, (pocty.get(cil) ?? 0) + 1);
  return pocty;
}

function spocitatKandidaty(s: Stav): HracId[] {
  const pocty = spocitatNominace(s.aktualni!);
  if (s.imunita) pocty.delete(s.imunita);
  const serazene = [...pocty.entries()].sort((a, b) => b[1] - a[1]);
  if (serazene.length === 0) return [];
  if (serazene.length === 1) return [serazene[0]![0]];
  const druhy = serazene[1]![1];
  return serazene.filter(([, n], i) => i < 2 || n === druhy).map(([id]) => id);
}

/**
 * Vyhoštění potřebuje nadpoloviční většinu odevzdaných hlasů a nejméně dva
 * hlasy. Při rovnosti neodchází nikdo. Kolo bez vyhoštění je legitimní
 * výsledek, ne zaseknutá hra, a jediný hlas nesmí nikoho poslat pryč.
 */
export const MIN_HLASU_PRO_VYHOSTENI = 2;

function vyhodnotitRadu(s: Stav): Stav {
  const k = s.aktualni!;
  const vsechny = [...Object.values(k.hlasy), ...Object.values(k.hlasyStinu)];
  const pocty = new Map<HracId, number>();
  for (const cil of vsechny) pocty.set(cil, (pocty.get(cil) ?? 0) + 1);
  const serazene = [...pocty.entries()].sort((a, b) => b[1] - a[1]);
  const prvni = serazene[0];
  const vyhosteny =
    prvni && prvni[1] >= MIN_HLASU_PRO_VYHOSTENI && prvni[1] * 2 > vsechny.length ? prvni[0] : null;

  // Hlas stínu se utratí použitím, ať už rada někoho poslala pryč, nebo ne.
  const utraceni = new Set(Object.keys(k.hlasyStinu));
  let dalsi: Stav = {
    ...s,
    aktualni: { ...k, vyhosteny },
    hraci: s.hraci.map((h) => (utraceni.has(h.id) ? { ...h, hlasStinuUtracen: true } : h)),
  };
  if (vyhosteny) dalsi = odebrat(dalsi, vyhosteny);
  return { ...dalsi, faze: 'hlasy' };
}

function zacitDalsiKolo(s: Stav, r: Rng): Stav {
  const uzavrene = s.aktualni ? [...s.historie, s.aktualni] : s.historie;
  const dalsiCislo = s.kolo + 1;
  // Imunita a tma se tu schválně nemažou: patří nejbližší radě, a ta je až
  // v tomhle novém kole. Spotřebují se, až se rada sestaví.
  const mezi: Stav = { ...s, historie: uzavrene, aktualni: null, kolo: dalsiCislo };
  const konec = vyhodnotitKonec(mezi);
  if (konec) return { ...mezi, faze: 'konec', vitez: konec.vitez, duvodKonce: konec.duvod };
  const k = noveKolo(dalsiCislo);
  const sStim: Stav = { ...mezi, aktualni: k };
  return { ...sStim, faze: 'predel', aktualni: { ...k, smeny: [rozdatPartu(sStim, r)] } };
}

/**
 * Kolik sabotérů stůl podle veřejných informací ještě hledá.
 *
 * Odečítají se jen vyhoštění, protože jen u nich se role odhalí. V noci
 * umírají jen pracanti, takže je to zároveň skutečný počet, ale odvozuje
 * se z toho, co stůl viděl, ne ze stavu.
 */
export function zbyvaSaboteruVerejne(s: Stav): number {
  const odhaleni = [...s.historie, ...(s.aktualni ? [s.aktualni] : [])]
    .filter((k) => k.vyhosteny && s.role[k.vyhosteny] === 'saboter').length;
  return Math.max(0, s.pocetSaboteru - odhaleni);
}

/** Kolik živých musí chtít dál, aby se rozprava utnula. Nadpoloviční většina. */
export function potrebaProSkok(s: Stav): number {
  return Math.floor(zivi(s).length / 2) + 1;
}

const DALSI: Partial<Record<Faze, Faze>> = {
  predel: 'zadani',
  zadani: 'sichta',
  septanda: 'rozprava',
  rozprava: 'nominace',
  kandidati: 'posledni_slovo',
  hlasy: 'vyhosteni',
};

// ---------------------------------------------------------------- reducer

/**
 * `seed` je náhoda celé místnosti. Po síti ho drží worker a nikdy neopouští
 * server, na jednom telefonu si ho aplikace vylosuje při načtení. Není
 * volitelný schválně: výchozí hodnota by rozdala role pokaždé stejně.
 */
export function reducer(s: Stav, a: Akce, seed: number): Stav {
  const r = rng(seed + s.kolo * 7919 + s.faze.length);

  switch (a.typ) {
    case 'PRIDAT_HRACE': {
      if (s.faze !== 'satna') return s;
      if (s.hraci.length >= MAX_HRACU) return s;
      if (s.hraci.some((h) => h.id === a.id)) return s;
      const novy: Hrac = {
        id: a.id,
        jmeno: jedinecneJmeno(s, a.jmeno),
        zivy: true,
        hlasStinuUtracen: false,
        pripojeny: true,
        zakladatel: a.zakladatel ?? !s.hraci.some((h) => h.zakladatel),
        bezNej: false,
      };
      return { ...s, hraci: [...s.hraci, novy] };
    }

    case 'ODEBRAT_HRACE':
      if (s.faze !== 'satna') return s;
      return { ...s, hraci: zajistitZakladatele(s.hraci.filter((h) => h.id !== a.id)) };

    case 'ZMENIT_NASTAVENI':
      if (s.faze !== 'satna') return s;
      return { ...s, nastaveni: { ...s.nastaveni, ...a.nastaveni } };

    case 'ZACIT': {
      if (s.faze !== 'satna') return s;
      // Kdo v šatně vypadl a nevrátil se, nehraje. Jinak by hra začala s fantomem.
      const hraci = zajistitZakladatele(s.hraci.filter((h) => h.pripojeny));
      if (hraci.length < MIN_HRACU || hraci.length > MAX_HRACU) return s;
      const rr = rng(a.seed ?? seed);
      const sestava = sestavaPro(hraci.length);
      const ids = hraci.map((h) => h.id);
      const vybrani = vyber(ids, sestava.saboteri, rr);
      const role: Record<HracId, Role> = {};
      for (const id of ids) role[id] = vybrani.includes(id) ? 'saboter' : 'pracant';
      return {
        ...s,
        faze: 'rozdani',
        hraci,
        role,
        predak: vybrani[0] ?? null,
        pocetSaboteru: sestava.saboteri,
        limitSicht: sestava.limitSicht,
        smenyNaKolo: sestava.smenyNaKolo,
        kolo: 0,
        pripraveni: [],
        partie: a.partie ?? null,
      };
    }

    case 'ZNOVU': {
      if (s.faze !== 'konec') return s;
      return {
        ...prazdnyStav(),
        nastaveni: s.nastaveni,
        hraci: s.hraci.map((h) => ({ ...h, zivy: true, hlasStinuUtracen: false, bezNej: false })),
      };
    }

    case 'PRIPRAVEN': {
      if (s.faze !== 'rozdani') return s;
      if (!s.hraci.some((h) => h.id === a.id)) return s;
      const pripraveni = s.pripraveni.includes(a.id) ? s.pripraveni : [...s.pripraveni, a.id];
      const sPripravenymi: Stav = { ...s, pripraveni };
      // Online nemá kdo frontu posunout, takže start spustí poslední hráč sám.
      // Na koho se podle zakladatele nečeká, ten start nedrží.
      const cekame = s.hraci.filter((h) => h.pripojeny || !h.bezNej);
      if (!cekame.every((h) => pripraveni.includes(h.id))) return sPripravenymi;
      return zacitDalsiKolo({ ...sPripravenymi, kolo: 0 }, r);
    }

    case 'VOLBA_SICHTY': {
      if (s.faze !== 'sichta' || !s.aktualni) return s;
      const sm = posledniSmena(s.aktualni);
      if (!sm || !sm.parta.includes(a.id)) return s;
      const volba = a.volba === 'kazit' && !smiKazit(s, a.id) ? 'makat' : a.volba;
      const nove = { ...sm, volby: { ...sm.volby, [a.id]: volba } };
      const smeny = [...s.aktualni.smeny.slice(0, -1), nove];
      return { ...s, aktualni: { ...s.aktualni, smeny } };
    }

    case 'NOMINOVAT': {
      if (s.faze !== 'nominace' || !s.aktualni) return s;
      if (a.id === a.cil) return s;
      if (!hrac(s, a.id)?.zivy) return s;
      if (!hrac(s, a.cil)?.zivy) return s;
      return {
        ...s,
        aktualni: {
          ...s.aktualni,
          nominace: { ...s.aktualni.nominace, [a.id]: a.cil },
          beznominace: s.aktualni.beznominace.filter((x) => x !== a.id),
        },
      };
    }

    /** Nominovat nikoho je plnohodnotný tah, ne nečinnost. */
    case 'NENOMINUJU': {
      if (s.faze !== 'nominace' || !s.aktualni) return s;
      if (!hrac(s, a.id)?.zivy) return s;
      const nominace = { ...s.aktualni.nominace };
      delete nominace[a.id];
      const beznominace = s.aktualni.beznominace.includes(a.id)
        ? s.aktualni.beznominace
        : [...s.aktualni.beznominace, a.id];
      return { ...s, aktualni: { ...s.aktualni, nominace, beznominace } };
    }

    /** Zdržet se hlasování. Stín tím svůj jediný hlas neutratí. */
    case 'ZDRZUJU_SE': {
      if (s.faze !== 'rada' || !s.aktualni) return s;
      if (!hrac(s, a.id)) return s;
      const hlasy = { ...s.aktualni.hlasy };
      const hlasyStinu = { ...s.aktualni.hlasyStinu };
      delete hlasy[a.id];
      delete hlasyStinu[a.id];
      const zdrzeliSe = s.aktualni.zdrzeliSe.includes(a.id)
        ? s.aktualni.zdrzeliSe
        : [...s.aktualni.zdrzeliSe, a.id];
      return { ...s, aktualni: { ...s.aktualni, hlasy, hlasyStinu, zdrzeliSe } };
    }

    case 'HLASOVAT': {
      if (s.faze !== 'rada' || !s.aktualni) return s;
      if (!s.aktualni.kandidati.includes(a.cil)) return s;
      const h = hrac(s, a.id);
      if (!h) return s;
      const zdrzeliSe = s.aktualni.zdrzeliSe.filter((x) => x !== a.id);
      if (h.zivy) {
        return { ...s, aktualni: { ...s.aktualni, zdrzeliSe, hlasy: { ...s.aktualni.hlasy, [a.id]: a.cil } } };
      }
      if (h.hlasStinuUtracen) return s;
      return { ...s, aktualni: { ...s.aktualni, zdrzeliSe, hlasyStinu: { ...s.aktualni.hlasyStinu, [a.id]: a.cil } } };
    }

    case 'VYBRAT_ODMENU': {
      if (s.faze !== 'noc' || !s.aktualni) return s;
      if (!dostupneOdmeny(s).includes(a.odmena)) return s;
      const k = { ...s.aktualni, odmena: a.odmena };
      if (a.odmena === 'imunita') {
        // Imunita bez jména není odměna. Chránit jde kohokoliv živého, i pracanta.
        if (!a.cil || !hrac(s, a.cil)?.zivy) return s;
        return { ...s, aktualni: { ...k, obet: null }, imunita: a.cil, tmaPristiRady: false };
      }
      if (a.odmena === 'tma') return { ...s, aktualni: { ...k, obet: null }, imunita: null, tmaPristiRady: true };
      return { ...s, aktualni: k, imunita: null, tmaPristiRady: false };
    }

    case 'NAVRHNOUT_OBET': {
      if (s.faze !== 'noc' || !s.aktualni) return s;
      if (s.role[a.id] !== 'saboter' || !hrac(s, a.id)?.zivy) return s;
      if (s.role[a.cil] === 'saboter' || !hrac(s, a.cil)?.zivy) return s;
      return { ...s, aktualni: { ...s.aktualni, navrhyObeti: { ...s.aktualni.navrhyObeti, [a.id]: a.cil } } };
    }

    case 'PREDAK_ROZHODL': {
      if (s.faze !== 'noc' || !s.aktualni) return s;
      if (s.aktualni.odmena !== 'vrazda') return s;
      if (!hrac(s, a.cil)?.zivy || s.role[a.cil] === 'saboter') return s;
      return { ...s, aktualni: { ...s.aktualni, obet: a.cil } };
    }

    case 'ZAPSAT_PODEZRELEHO': {
      if (s.faze !== 'noc' || !s.aktualni) return s;
      if (!hrac(s, a.id) || a.id === a.cil || !hrac(s, a.cil)?.zivy) return s;
      return { ...s, aktualni: { ...s.aktualni, podezreli: { ...s.aktualni.podezreli, [a.id]: a.cil } } };
    }

    case 'ODPOJIL_SE': {
      if (!hrac(s, a.id)) return s;
      const hraci = s.hraci.map((h) => (h.id === a.id ? { ...h, pripojeny: false } : h));
      // V šatně přejde funkce zakladatele na někoho, kdo je u toho.
      const sHraci: Stav = { ...s, hraci: s.faze === 'satna' ? zajistitZakladatele(hraci) : hraci };
      return { ...sHraci, pauza: spocitatPauzu(sHraci) };
    }

    case 'PRIPOJIL_SE': {
      if (!hrac(s, a.id)) return s;
      const hraci = s.hraci.map((h) => (h.id === a.id ? { ...h, pripojeny: true, bezNej: false } : h));
      const sHraci: Stav = { ...s, hraci };
      return { ...sHraci, pauza: spocitatPauzu(sHraci) };
    }

    case 'HRAT_BEZ_NEJ': {
      if (!hrac(s, a.id)) return s;
      const hraci = s.hraci.map((h) => (h.id === a.id ? { ...h, bezNej: true } : h));
      const sHraci: Stav = { ...s, hraci };
      return { ...sHraci, pauza: spocitatPauzu(sHraci) };
    }

    /**
     * Hlasování o zkrácení rozpravy. Tři minuty se často nevypovídají
     * a čekat na odpočet je otrava. Většina živých to utne.
     *
     * Kdo chce dál, je vidět, a to je záměr: tlak, ať to někdo rozsekne.
     * Odvolat to jde, dokud většina nepadne.
     */
    case 'CHCI_DAL': {
      if (s.faze !== 'rozprava' || !s.aktualni) return s;
      if (!hrac(s, a.id)?.zivy) return s;
      const uz = s.aktualni.chtejiDal.includes(a.id);
      const chtejiDal = uz
        ? s.aktualni.chtejiDal.filter((x) => x !== a.id)
        : [...s.aktualni.chtejiDal, a.id];
      const sNovymi: Stav = { ...s, aktualni: { ...s.aktualni, chtejiDal } };
      if (chtejiDal.length < potrebaProSkok(sNovymi)) return sNovymi;
      return { ...sNovymi, faze: 'nominace' };
    }

    case 'DALSI_FAZE': {
      if (s.pauza) return s;

      switch (s.faze) {
        case 'rozdani':
          return zacitDalsiKolo({ ...s, kolo: 0 }, r);

        case 'sichta': {
          const k = s.aktualni!;
          const sm = vyhodnotitSmenu(posledniSmena(k)!);
          return { ...s, faze: 'vysledek', aktualni: { ...k, smeny: [...k.smeny.slice(0, -1), sm] } };
        }

        case 'vysledek':
          return poVysledku(s, r);

        case 'nominace': {
          // Tady se spotřebuje, co sabotéři vzali v noci: imunita vyřadí z rady,
          // tma zakryje hlasy. Obojí se zapíše do kola, ať to zůstane v historii.
          const kandidati = spocitatKandidaty(s);
          const k: Kolo = { ...s.aktualni!, kandidati, mluvi: 0, imunni: s.imunita, tma: s.tmaPristiRady };
          const dalsi: Stav = { ...s, aktualni: k, imunita: null, tmaPristiRady: false };
          if (kandidati.length === 0) return { ...dalsi, faze: 'vyhosteni' };
          return { ...dalsi, faze: 'kandidati' };
        }

        case 'posledni_slovo': {
          const k = s.aktualni!;
          if (k.mluvi + 1 < k.kandidati.length) return { ...s, aktualni: { ...k, mluvi: k.mluvi + 1 } };
          return { ...s, faze: 'rada' };
        }

        case 'rada':
          return vyhodnotitRadu(s);

        case 'vyhosteni': {
          const konec = vyhodnotitKonec(s);
          if (konec) return { ...s, faze: 'konec', vitez: konec.vitez, duvodKonce: konec.duvod };
          const padla = posledniSmena(s.aktualni!)?.padla === true;
          if (!padla) return zacitDalsiKolo({ ...s, vrazdaMinuleKolo: false }, r);
          return { ...s, faze: 'noc' };
        }

        case 'noc': {
          const k = s.aktualni!;
          if (k.odmena === 'vrazda' && k.obet) {
            const po = odebrat({ ...s, vrazdaMinuleKolo: true }, k.obet);
            return { ...po, faze: 'rano' };
          }
          return { ...s, faze: 'rano', vrazdaMinuleKolo: false };
        }

        case 'rano':
          return zacitDalsiKolo(mozneUkoncit(s), r);

        default: {
          const dalsi = DALSI[s.faze];
          return dalsi ? { ...s, faze: dalsi } : s;
        }
      }
    }

    default:
      return s;
  }
}
