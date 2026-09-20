import type { Faze, HracId, Kolo, Odmena, Role, Smena, Stav } from './types';
import {
  dostupneOdmeny, kdoOdevzdal, posledniSmena, potrebaProSkok, spocitatNominace,
  zbyvaSaboteruVerejne, ziviSaboteri,
} from './machine';

/**
 * Co smí vidět jeden konkrétní hráč. Tohle je jediná cesta, kterou stav opouští
 * server, takže se sem musí vejít každé pravidlo o tajnosti.
 *
 * Role ostatních se ven nedostane. Jediná výjimka je informovaná menšina:
 * sabotér zná ostatní sabotéry, protože to je pravidlo hry, ne únik.
 *
 * Časování má taky pravidla: hlasy z rady se ukážou až při odhalení, oběť až
 * ráno, odměna z noci stolu až ráno. Obrazovky to nekreslí dřív, ale po drátě
 * to nesmí být vůbec.
 */

export interface PohledHrace {
  id: HracId;
  jmeno: string;
  zivy: boolean;
  hlasStinuUtracen: boolean;
  pripojeny: boolean;
  zakladatel: boolean;
  bezNej: boolean;
}

export interface HlasVerejny { kdo: HracId; komu: HracId; stin: boolean }

/** Jedno kolo tak, jak ho smí vidět celý stůl. Historie part a hlasování. */
export interface KoloVerejne {
  cislo: number;
  smeny: { smena: Smena; parta: HracId[]; padla: boolean; sabotazi: number }[];
  vyhosteny: HracId | null;
  roleVyhosteneho: Role | null;
  obet: HracId | null;
  imunni: HracId | null;
  tma: boolean;
  /** null pod tmou: hlasy zůstávají zakryté až do konce hry. */
  hlasy: HlasVerejny[] | null;
}

export interface Pohled {
  faze: Faze;
  kolo: number;
  limitSicht: number;
  pocetSaboteru: number;
  nastaveni: Stav['nastaveni'];
  pauza: Stav['pauza'];
  vitez: Stav['vitez'];
  duvodKonce: string | null;
  /** Čas serveru, kdy končí fáze. Na jednom telefonu null. */
  konecFaze: number | null;
  partie: string | null;

  hraci: PohledHrace[];

  /** Moje role a co k ní patří. Nikdo jiný tohle nedostane. */
  ja: {
    id: HracId;
    role: Role | null;
    jsemPredak: boolean;
    spoluSaboteri: { id: HracId; jmeno: string; predak: boolean }[];
    /** Moje vlastní volba, ať ji po obnovení stránky vidím zpátky. */
    volbaSichty: 'makat' | 'kazit' | null;
    nominoval: HracId | null;
    hlasoval: HracId | null;
    /** Jen předák a jen po padlé šichtě. Ostatním prázdné. */
    odmeny: Odmena[];
    /** Moje šeptanda. Každý má jinou a cizí se ven neposílá. */
    septanda: string | null;
    /** Rozhodl jsem se nikoho nenominovat, respektive zdržet se hlasování. */
    nenominuju: boolean;
    zdrzelSeHlasovani: boolean;
    /** Návrhy ostatních sabotérů na oběť. Jen sabotéři, jen v noci. */
    navrhy: { kdo: HracId; komu: HracId }[];
    /** Můj návrh oběti, respektive rozhodnutí předáka. */
    navrhl: HracId | null;
    rozhodl: HracId | null;
    /** Můj tip na sabotéra z téhle noci. */
    podezrely: HracId | null;
    /** Mám v téhle fázi hotovo. */
    odevzdal: boolean;
  };

  /** Veřejné. Přesně tohle vidí celý stůl a nic víc. */
  stul: {
    smena: Smena | null;
    parta: HracId[];
    sabotazi: number | null;
    padla: boolean | null;

    kandidati: HracId[];
    /** Kdo z kandidátů má právě poslední slovo. */
    mluvi: number;
    /** Kolik nominací kdo dostal. Až po uzavření nominací, do té doby null. */
    nominaci: Record<HracId, number> | null;
    hlasy: HlasVerejny[];
    vyhosteny: HracId | null;
    roleVyhosteneho: Role | null;
    obet: HracId | null;
    /** Odměna z noci. Sabotéři ji vidí hned, stůl ráno. */
    odmena: Odmena | null;
    /** Kdo má imunitu pro nejbližší radu. Veřejné od rána. */
    imunni: HracId | null;
    /** Bude nejbližší rada potmě. Veřejné od rána. */
    tma: boolean;
    /** Kdo už v téhle fázi odevzdal. Jen kolik a kdo, nikdy co. */
    odevzdali: HracId[];
    /** Kdo chce utnout rozpravu. Veřejné, ať je vidět tlak. */
    chtejiDal: HracId[];
    /** Kolik jich musí chtít, aby se rozprava utnula. */
    potrebaProSkok: number;
    /**
     * Kolik sabotérů stůl podle veřejných informací ještě hledá.
     * Počítá se jen z odhalených rolí vyhoštěných.
     */
    zbyvaSaboteru: number;
    /** Uzavřená kola a hotové části toho běžícího. Během rozpravy ji obrazovka zamkne. */
    historie: KoloVerejne[];
  };

  /** Až po konci hry. Do té doby null, jinak by to byl únik všeho naráz. */
  konec: {
    role: Record<HracId, Role>;
    predak: HracId | null;
    kola: {
      cislo: number;
      padla: boolean;
      sabotazi: number;
      parta: HracId[];
      vyhosteny: HracId | null;
      obet: HracId | null;
    }[];
    /** Kdo z pracantů nejčastěji tipoval správně. Nemá vliv na výsledek. */
    cuch: { id: HracId; trefil: number; z: number } | null;
  } | null;
}

/** Sabotér ví, koho tipovat, tak se do ceny nepočítá. */
function spocitatCuch(s: Stav): { id: HracId; trefil: number; z: number } | null {
  const skore = new Map<HracId, { trefil: number; z: number }>();
  for (const k of [...s.historie, ...(s.aktualni ? [s.aktualni] : [])]) {
    for (const [kdo, na] of Object.entries(k.podezreli)) {
      if (s.role[kdo] === 'saboter') continue;
      const x = skore.get(kdo) ?? { trefil: 0, z: 0 };
      x.z += 1;
      if (s.role[na] === 'saboter') x.trefil += 1;
      skore.set(kdo, x);
    }
  }
  let nej: { id: HracId; trefil: number; z: number } | null = null;
  for (const [id, x] of skore) {
    if (x.trefil > 0 && (!nej || x.trefil > nej.trefil)) nej = { id, ...x };
  }
  return nej;
}

/** Fáze, od které jsou hlasy rady z tohohle kola veřejné. */
const PO_RADE: ReadonlySet<Faze> = new Set(['hlasy', 'vyhosteni', 'noc', 'rano']);
/** Fáze, od které jsou počty nominací veřejné. */
const PO_NOMINACI: ReadonlySet<Faze> = new Set(['kandidati', 'posledni_slovo', 'rada', 'hlasy', 'vyhosteni', 'noc', 'rano']);

const hlasyKola = (k: Kolo): HlasVerejny[] => [
  ...Object.entries(k.hlasy).map(([kdo, komu]) => ({ kdo, komu, stin: false })),
  ...Object.entries(k.hlasyStinu).map(([kdo, komu]) => ({ kdo, komu, stin: true })),
];

/** Uzavřené kolo je veřejné celé, kromě hlasů pod tmou. Ty se odkryjí až po konci hry. */
function koloVerejne(s: Stav, k: Kolo, bezici: boolean): KoloVerejne {
  const konecHry = s.faze === 'konec';
  const poRade = !bezici || PO_RADE.has(s.faze);
  const vyhosteny = poRade ? k.vyhosteny : null;
  return {
    cislo: k.cislo,
    smeny: k.smeny
      .filter((sm) => sm.padla !== null)
      .map((sm) => ({ smena: sm.smena, parta: sm.parta, padla: sm.padla === true, sabotazi: sm.sabotazi ?? 0 })),
    vyhosteny,
    roleVyhosteneho: vyhosteny ? (s.role[vyhosteny] ?? null) : null,
    obet: !bezici || s.faze === 'rano' ? k.obet : null,
    imunni: !bezici || PO_NOMINACI.has(s.faze) ? k.imunni : null,
    tma: !bezici || PO_NOMINACI.has(s.faze) ? k.tma : false,
    hlasy: k.tma && !konecHry ? null : poRade ? hlasyKola(k) : [],
  };
}

export function pohledPro(s: Stav, jaId: HracId): Pohled {
  const k = s.aktualni;
  const sm = k ? posledniSmena(k) : undefined;
  const mojeRole = s.role[jaId] ?? null;
  const konec = s.faze === 'konec';
  const jsemSaboter = mojeRole === 'saboter';
  const noc = s.faze === 'noc';

  const spolu = jsemSaboter
    ? ziviSaboteri(s)
        .filter((h) => h.id !== jaId)
        .map((h) => ({ id: h.id, jmeno: h.jmeno, predak: h.id === s.predak }))
    : [];

  // Role vyhoštěného se odhaluje veřejně, to je pravidlo. Ostatní role ne.
  const vyhosteny = k?.vyhosteny ?? null;
  const ukazatRoli = vyhosteny && (s.faze === 'vyhosteni' || konec);
  const odevzdali = kdoOdevzdal(s);

  // Co si sabotéři vzali v noci, vidí hned. Stůl to zjistí ráno.
  const nocniTajemstvi = noc && !jsemSaboter;
  const imunni = nocniTajemstvi ? null : s.imunita ?? k?.imunni ?? null;
  const tma = nocniTajemstvi ? false : s.tmaPristiRady || (k?.tma ?? false);
  const odmena = nocniTajemstvi || (s.faze !== 'noc' && s.faze !== 'rano' && !konec) ? null : k?.odmena ?? null;

  return {
    faze: s.faze,
    kolo: s.kolo,
    limitSicht: s.limitSicht,
    pocetSaboteru: s.pocetSaboteru,
    nastaveni: s.nastaveni,
    pauza: s.pauza,
    vitez: s.vitez,
    duvodKonce: s.duvodKonce,
    konecFaze: s.konecFaze,
    partie: s.partie,

    hraci: s.hraci.map((h) => ({
      id: h.id, jmeno: h.jmeno, zivy: h.zivy, hlasStinuUtracen: h.hlasStinuUtracen,
      pripojeny: h.pripojeny, zakladatel: h.zakladatel, bezNej: h.bezNej,
    })),

    ja: {
      id: jaId,
      role: mojeRole,
      jsemPredak: s.predak === jaId,
      spoluSaboteri: spolu,
      volbaSichty: sm?.volby[jaId] ?? null,
      nominoval: k?.nominace[jaId] ?? null,
      hlasoval: k?.hlasy[jaId] ?? k?.hlasyStinu[jaId] ?? null,
      odmeny: s.predak === jaId ? dostupneOdmeny(s) : [],
      // Vlastní věta. Cizí šeptanda se z pohledu nedostane ven ani omylem,
      // protože se sem kopíruje jediný klíč, ne celý objekt.
      septanda: k?.septanda[jaId] ?? null,
      nenominuju: k?.beznominace.includes(jaId) ?? false,
      zdrzelSeHlasovani: k?.zdrzeliSe.includes(jaId) ?? false,
      navrhy: jsemSaboter && noc && k
        ? Object.entries(k.navrhyObeti).filter(([kdo]) => kdo !== jaId).map(([kdo, komu]) => ({ kdo, komu }))
        : [],
      navrhl: jsemSaboter ? k?.navrhyObeti[jaId] ?? null : null,
      rozhodl: s.predak === jaId ? k?.obet ?? null : null,
      podezrely: k?.podezreli[jaId] ?? null,
      odevzdal: odevzdali.includes(jaId),
    },

    stul: {
      smena: sm?.smena ?? null,
      parta: sm?.parta ?? [],
      // počet sabotáží ven jde, až když je šichta vyhodnocená
      sabotazi: s.faze === 'sichta' ? null : sm?.sabotazi ?? null,
      padla: s.faze === 'sichta' ? null : sm?.padla ?? null,

      kandidati: k?.kandidati ?? [],
      mluvi: k?.mluvi ?? 0,
      nominaci: k && PO_NOMINACI.has(s.faze) ? Object.fromEntries(spocitatNominace(k)) : null,
      // hlasy až po odhalení, pod tmou vůbec; na konci hry všechno
      hlasy: k && (konec || (PO_RADE.has(s.faze) && !k.tma)) ? hlasyKola(k) : [],
      vyhosteny: PO_RADE.has(s.faze) || konec ? vyhosteny : null,
      roleVyhosteneho: ukazatRoli ? (s.role[vyhosteny] ?? null) : null,
      obet: s.faze === 'rano' || konec ? k?.obet ?? null : null,
      odmena,
      imunni,
      tma,
      odevzdali,
      chtejiDal: k?.chtejiDal ?? [],
      potrebaProSkok: potrebaProSkok(s),
      zbyvaSaboteru: zbyvaSaboteruVerejne(s),
      historie: [
        ...s.historie.map((x) => koloVerejne(s, x, false)),
        ...(k && k.smeny.some((x) => x.padla !== null) ? [koloVerejne(s, k, true)] : []),
      ],
    },

    konec: konec
      ? {
          role: s.role,
          predak: s.predak,
          kola: [...s.historie, ...(k ? [k] : [])].map((x) => {
            const posledni = posledniSmena(x);
            return {
              cislo: x.cislo,
              padla: posledni?.padla ?? false,
              sabotazi: posledni?.sabotazi ?? 0,
              parta: posledni?.parta ?? [],
              vyhosteny: x.vyhosteny,
              obet: x.obet,
            };
          }),
          cuch: spocitatCuch(s),
        }
      : null,
  };
}
