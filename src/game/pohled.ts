import type { HracId, Odmena, Role, Smena, Stav } from './types';
import { dostupneOdmeny, posledniSmena, potrebaProSkok, zbyvaSaboteruVerejne, ziviSaboteri } from './machine';

/**
 * Co smí vidět jeden konkrétní hráč. Tohle je jediná cesta, kterou stav opouští
 * server, takže se sem musí vejít každé pravidlo o tajnosti.
 *
 * Role ostatních se ven nedostane. Jediná výjimka je informovaná menšina:
 * sabotér zná ostatní sabotéry, protože to je pravidlo hry, ne únik.
 */

export interface PohledHrace {
  id: HracId;
  jmeno: string;
  zivy: boolean;
  hlasStinuUtracen: boolean;
  pripojeny: boolean;
  zakladatel: boolean;
}

export interface Pohled {
  faze: Stav['faze'];
  kolo: number;
  limitSicht: number;
  pocetSaboteru: number;
  nastaveni: Stav['nastaveni'];
  pauza: Stav['pauza'];
  vitez: Stav['vitez'];
  duvodKonce: string | null;

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
  };

  /** Veřejné. Přesně tohle vidí celý stůl a nic víc. */
  stul: {
    smena: Smena | null;
    parta: HracId[];
    sabotazi: number | null;
    padla: boolean | null;

    kandidati: HracId[];
    hlasy: { kdo: HracId; komu: HracId; stin: boolean }[];
    vyhosteny: HracId | null;
    roleVyhosteneho: Role | null;
    obet: HracId | null;
    tmaNadHlasovanim: boolean;
    /** Kdo už v téhle fázi odevzdal. Jen kolik a kdo, nikdy co. */
    odevzdali: HracId[];
    odmena: Odmena | null;
    /** Kdo chce utnout rozpravu. Veřejné, ať je vidět tlak. */
    chtejiDal: HracId[];
    /** Kolik jich musí chtít, aby se rozprava utnula. */
    potrebaProSkok: number;
    /**
     * Kolik sabotérů stůl podle veřejných informací ještě hledá.
     *
     * Počítá se **jen z odhalených rolí vyhoštěných**, protože jen ty jsou
     * veřejné. Kdo umře v noci, roli si vezme s sebou. Kdyby se tohle
     * odvozovalo ze skutečného stavu, ukazovalo by to stolu víc, než ví.
     */
    zbyvaSaboteru: number;
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
    /** Kdo nejčastěji tipoval správně. Nemá vliv na výsledek. */
    cuch: { id: HracId; trefil: number; z: number } | null;
  } | null;
}

function spocitatCuch(s: Stav): { id: HracId; trefil: number; z: number } | null {
  const skore = new Map<HracId, { trefil: number; z: number }>();
  for (const k of s.historie) {
    for (const [kdo, na] of Object.entries(k.podezreli)) {
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

function odevzdaliVFazi(s: Stav): HracId[] {
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
    case 'noc':
      return [...Object.keys(k.podezreli), ...Object.keys(k.navrhyObeti)];
    default:
      return [];
  }
}

export function pohledPro(s: Stav, jaId: HracId): Pohled {
  const k = s.aktualni;
  const sm = k ? posledniSmena(k) : undefined;
  const mojeRole = s.role[jaId] ?? null;
  const konec = s.faze === 'konec';

  const spolu = mojeRole === 'saboter'
    ? ziviSaboteri(s)
        .filter((h) => h.id !== jaId)
        .map((h) => ({ id: h.id, jmeno: h.jmeno, predak: h.id === s.predak }))
    : [];

  // Role vyhoštěného se odhaluje veřejně, to je pravidlo. Ostatní role ne.
  const vyhosteny = k?.vyhosteny ?? null;
  const ukazatRoli = vyhosteny && (s.faze === 'vyhosteni' || s.faze === 'konec');

  return {
    faze: s.faze,
    kolo: s.kolo,
    limitSicht: s.limitSicht,
    pocetSaboteru: s.pocetSaboteru,
    nastaveni: s.nastaveni,
    pauza: s.pauza,
    vitez: s.vitez,
    duvodKonce: s.duvodKonce,

    hraci: s.hraci.map((h) => ({
      id: h.id, jmeno: h.jmeno, zivy: h.zivy,
      hlasStinuUtracen: h.hlasStinuUtracen, pripojeny: h.pripojeny, zakladatel: h.zakladatel,
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
    },

    stul: {
      smena: sm?.smena ?? null,
      parta: sm?.parta ?? [],
      // počet sabotáží ven jde, až když je šichta vyhodnocená
      sabotazi: s.faze === 'sichta' ? null : sm?.sabotazi ?? null,
      padla: s.faze === 'sichta' ? null : sm?.padla ?? null,

      kandidati: k?.kandidati ?? [],
      // pod Tmou se hlasy neukazují vůbec
      hlasy: s.tmaNadHlasovanim && !konec ? [] : [
        ...Object.entries(k?.hlasy ?? {}).map(([kdo, komu]) => ({ kdo, komu, stin: false })),
        ...Object.entries(k?.hlasyStinu ?? {}).map(([kdo, komu]) => ({ kdo, komu, stin: true })),
      ],
      vyhosteny,
      roleVyhosteneho: ukazatRoli ? (s.role[vyhosteny] ?? null) : null,
      obet: k?.obet ?? null,
      tmaNadHlasovanim: s.tmaNadHlasovanim,
      odevzdali: odevzdaliVFazi(s),
      // odměnu vidí jen sabotéři, stůl ne
      odmena: mojeRole === 'saboter' || konec ? k?.odmena ?? null : null,
      chtejiDal: k?.chtejiDal ?? [],
      potrebaProSkok: potrebaProSkok(s),
      zbyvaSaboteru: zbyvaSaboteruVerejne(s),
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
