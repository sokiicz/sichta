import type { Akce, Faze, Hrac, HracId, Kolo, Odmena, Role, Smenaz, Stav, Tym } from './types';
import { MAX_HRACU, MIN_HRACU, sestavaPro, velikostParty } from './rules';
import { rng, vyber, type Rng } from './random';
import { vybratSeptandu } from './septanda';

export function prazdnyStav(): Stav {
  return {
    faze: 'satna',
    hraci: [],
    role: {},
    predak: null,
    pocetSaboteru: 0,
    limitSicht: 0,
    smenyNaKolo: 1,
    nastaveni: { mistrVybiraPartu: false, tajnySaboter: false, umlceniMistoVyrazeni: false },
    kolo: 0,
    aktualni: null,
    historie: [],
    vrazdaMinulouNoc: false,
    imunita: null,
    tmaNadHlasovanim: false,
    vitez: null,
    duvodKonce: null,
    pauza: null,
    pripraveni: [],
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

/** Vražda dvakrát po sobě nejde. Bez padlé odpolední směny není co si brát. */
export function dostupneOdmeny(s: Stav): Odmena[] {
  const k = s.aktualni;
  const sm = k ? posledniSmena(k) : undefined;
  if (!sm?.padla) return [];
  return s.vrazdaMinulouNoc ? ['imunita', 'tma'] : ['vrazda', 'imunita', 'tma'];
}

/** Sabotovat smí jen sabotér. "Omylem jsem sabotoval" nesmí existovat. */
export function smiKazit(s: Stav, id: HracId): boolean {
  return s.role[id] === 'saboter';
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
    septanda: null,
    nominace: {},
    kandidati: [],
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

function odebrat(s: Stav, id: HracId): Stav {
  return { ...s, hraci: s.hraci.map((h) => (h.id === id ? { ...h, zivy: false } : h)) };
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

  const sm = posledniSmena(k)!;
  const vysledek = vybratSeptandu(
    { role: s.role, jmeno: (id) => jmeno(s, id), kolo: k, posledniSmena: sm, zivi: zivi(s).map((h) => h.id) },
    r,
    s.historie.map((h) => h.septanda ?? '').filter(Boolean),
  );
  if (!vysledek) return { ...s, faze: 'rozprava' };
  return { ...s, faze: 'septanda', aktualni: { ...k, septanda: vysledek.text } };
}

function spocitatKandidaty(s: Stav): HracId[] {
  const k = s.aktualni!;
  const pocty = new Map<HracId, number>();
  for (const cil of Object.values(k.nominace ?? {})) pocty.set(cil, (pocty.get(cil) ?? 0) + 1);
  // imunní se do rady nedostane
  if (s.imunita) pocty.delete(s.imunita);
  const serazene = [...pocty.entries()].sort((a, b) => b[1] - a[1]);
  if (serazene.length === 0) return [];
  if (serazene.length === 1) return [serazene[0]![0]];
  const druhy = serazene[1]![1];
  return serazene.filter(([, n], i) => i < 2 || n === druhy).map(([id]) => id);
}

function vyhodnotitRadu(s: Stav): Stav {
  const k = s.aktualni!;
  const pocty = new Map<HracId, number>();
  for (const cil of [...Object.values(k.hlasy ?? {}), ...Object.values(k.hlasyStinu ?? {})]) {
    pocty.set(cil, (pocty.get(cil) ?? 0) + 1);
  }
  const serazene = [...pocty.entries()].sort((a, b) => b[1] - a[1]);
  const prvni = serazene[0];
  const druhy = serazene[1];
  // při rovnosti neodchází nikdo
  const vyhosteny = prvni && (!druhy || prvni[1] > druhy[1]) ? prvni[0] : null;

  let dalsi: Stav = { ...s, aktualni: { ...k, vyhosteny } };
  if (vyhosteny) {
    dalsi = odebrat(dalsi, vyhosteny);
    // hlas stínu se utrácí, jakmile ho použije
    dalsi = {
      ...dalsi,
      hraci: dalsi.hraci.map((h) => ((k.hlasyStinu ?? {})[h.id] != null ? { ...h, hlasStinuUtracen: true } : h)),
    };
  }
  return { ...dalsi, faze: 'hlasy' };
}

function zacitDalsiKolo(s: Stav, r: Rng): Stav {
  const uzavrene = s.aktualni ? [...s.historie, s.aktualni] : s.historie;
  const dalsiCislo = s.kolo + 1;
  const mezi: Stav = { ...s, historie: uzavrene, aktualni: null, kolo: dalsiCislo, imunita: null, tmaNadHlasovanim: false };
  const konec = vyhodnotitKonec(mezi);
  if (konec) return { ...mezi, faze: 'konec', vitez: konec.vitez, duvodKonce: konec.duvod };
  const k = noveKolo(dalsiCislo);
  const sStim: Stav = { ...mezi, aktualni: k };
  return { ...sStim, faze: 'predel', aktualni: { ...k, smeny: [rozdatPartu(sStim, r)] } };
}

const DALSI: Partial<Record<Faze, Faze>> = {
  predel: 'zadani',
  zadani: 'sichta',
  septanda: 'rozprava',
  rozprava: 'nominace',
  kandidati: 'posledni_slovo',
  posledni_slovo: 'rada',
  hlasy: 'vyhosteni',
};

// ---------------------------------------------------------------- reducer

export function reducer(s: Stav, a: Akce, seed = 1): Stav {
  const r = rng(seed + s.kolo * 7919 + s.faze.length);

  switch (a.typ) {
    case 'PRIDAT_HRACE': {
      if (s.faze !== 'satna') return s;
      if (s.hraci.length >= MAX_HRACU) return s;
      if (s.hraci.some((h) => h.id === a.id)) return s;
      const novy: Hrac = {
        id: a.id,
        jmeno: a.jmeno.trim().slice(0, 12) || 'Bezejmenný',
        zivy: true,
        hlasStinuUtracen: false,
        pripojeny: true,
        zakladatel: a.zakladatel ?? s.hraci.length === 0,
      };
      return { ...s, hraci: [...s.hraci, novy] };
    }

    case 'ODEBRAT_HRACE':
      if (s.faze !== 'satna') return s;
      return { ...s, hraci: s.hraci.filter((h) => h.id !== a.id) };

    case 'ZMENIT_NASTAVENI':
      if (s.faze !== 'satna') return s;
      return { ...s, nastaveni: { ...s.nastaveni, ...a.nastaveni } };

    case 'ZACIT': {
      if (s.faze !== 'satna') return s;
      if (s.hraci.length < MIN_HRACU || s.hraci.length > MAX_HRACU) return s;
      const rr = rng(a.seed ?? seed);
      const sestava = sestavaPro(s.hraci.length);
      const ids = s.hraci.map((h) => h.id);
      const vybrani = vyber(ids, sestava.saboteri, rr);
      const role: Record<HracId, Role> = {};
      for (const id of ids) role[id] = vybrani.includes(id) ? 'saboter' : 'pracant';
      return {
        ...s,
        faze: 'rozdani',
        role,
        predak: vybrani[0] ?? null,
        pocetSaboteru: sestava.saboteri,
        limitSicht: sestava.limitSicht,
        smenyNaKolo: sestava.smenyNaKolo,
        kolo: 0,
        pripraveni: [],
      };
    }

    case 'PRIPRAVEN': {
      if (s.faze !== 'rozdani') return s;
      if (!s.hraci.some((h) => h.id === a.id)) return s;
      const pripraveni = s.pripraveni.includes(a.id) ? s.pripraveni : [...s.pripraveni, a.id];
      const sPripravenymi: Stav = { ...s, pripraveni };
      // Online nemá kdo frontu posunout, takže start spustí poslední hráč sám.
      if (pripraveni.length < s.hraci.length) return sPripravenymi;
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
      return { ...s, aktualni: { ...s.aktualni, nominace: { ...s.aktualni.nominace, [a.id]: a.cil } } };
    }

    case 'HLASOVAT': {
      if (s.faze !== 'rada' || !s.aktualni) return s;
      if (!s.aktualni.kandidati.includes(a.cil)) return s;
      const h = hrac(s, a.id);
      if (!h) return s;
      if (h.zivy) {
        return { ...s, aktualni: { ...s.aktualni, hlasy: { ...s.aktualni.hlasy, [a.id]: a.cil } } };
      }
      if (h.hlasStinuUtracen) return s;
      return { ...s, aktualni: { ...s.aktualni, hlasyStinu: { ...s.aktualni.hlasyStinu, [a.id]: a.cil } } };
    }

    case 'VYBRAT_ODMENU': {
      if (s.faze !== 'noc' || !s.aktualni) return s;
      if (!dostupneOdmeny(s).includes(a.odmena)) return s;
      const k = { ...s.aktualni, odmena: a.odmena };
      if (a.odmena === 'imunita') return { ...s, aktualni: k, imunita: a.cil ?? null };
      if (a.odmena === 'tma') return { ...s, aktualni: k, tmaNadHlasovanim: true };
      return { ...s, aktualni: k };
    }

    case 'NAVRHNOUT_OBET': {
      if (s.faze !== 'noc' || !s.aktualni) return s;
      if (s.role[a.id] !== 'saboter') return s;
      if (s.role[a.cil] === 'saboter') return s;
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
      return { ...s, aktualni: { ...s.aktualni, podezreli: { ...s.aktualni.podezreli, [a.id]: a.cil } } };
    }

    case 'ODPOJIL_SE':
      return {
        ...s,
        hraci: s.hraci.map((h) => (h.id === a.id ? { ...h, pripojeny: false } : h)),
        pauza: s.faze === 'satna' || s.faze === 'konec' ? null : { duvod: 'vypadlo spojení', kvuli: a.id },
      };

    case 'PRIPOJIL_SE': {
      const hraci = s.hraci.map((h) => (h.id === a.id ? { ...h, pripojeny: true } : h));
      const porad = hraci.some((h) => !h.pripojeny);
      return { ...s, hraci, pauza: porad ? s.pauza : null };
    }

    case 'HRAT_BEZ_NEJ':
      return { ...s, pauza: null };

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
          const kandidati = spocitatKandidaty(s);
          if (kandidati.length === 0) return { ...s, faze: 'vyhosteni' };
          return { ...s, faze: 'kandidati', aktualni: { ...s.aktualni!, kandidati } };
        }

        case 'rada':
          return vyhodnotitRadu(s);

        case 'vyhosteni': {
          const konec = vyhodnotitKonec(s);
          if (konec) return { ...s, faze: 'konec', vitez: konec.vitez, duvodKonce: konec.duvod };
          const padla = posledniSmena(s.aktualni!)?.padla === true;
          if (!padla) return zacitDalsiKolo({ ...s, vrazdaMinulouNoc: false }, r);
          return { ...s, faze: 'noc' };
        }

        case 'noc': {
          const k = s.aktualni!;
          if (k.odmena === 'vrazda' && k.obet) {
            const po = odebrat({ ...s, vrazdaMinulouNoc: true }, k.obet);
            return { ...po, faze: 'rano' };
          }
          return { ...s, faze: 'rano', vrazdaMinulouNoc: false };
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
