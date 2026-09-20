/** Šichta — datové typy hry. Zdroj pravdy pro pravidla je docs/design.md. */

export type Role = 'pracant' | 'saboter';
export type Smena = 'dopoledni' | 'odpoledni';
export type Odmena = 'vrazda' | 'imunita' | 'tma';
export type Tym = 'pracanti' | 'saboteri';

export type Faze =
  | 'satna'
  | 'rozdani'
  | 'predel'
  | 'zadani'
  | 'sichta'
  | 'vysledek'
  | 'septanda'
  | 'rozprava'
  | 'nominace'
  | 'kandidati'
  | 'posledni_slovo'
  | 'rada'
  | 'hlasy'
  | 'vyhosteni'
  | 'noc'
  | 'rano'
  | 'konec';

export type HracId = string;

export interface Hrac {
  id: HracId;
  jmeno: string;
  zivy: boolean;
  /** Stín má jediný hlas na celou zbylou hru. Jakmile ho utratí, je pryč. */
  hlasStinuUtracen: boolean;
  pripojeny: boolean;
  zakladatel: boolean;
}

/** Jedna směna v rámci kola. Krátká hra má jednu, plná dvě. */
export interface Smenaz {
  smena: Smena;
  parta: HracId[];
  /** Kdo z party zmáčkl KAZIT. Po vyhodnocení se ven posílá jen počet. */
  volby: Record<HracId, 'makat' | 'kazit'>;
  sabotazi: number | null;
  padla: boolean | null;
}

export interface Kolo {
  cislo: number;
  smeny: Smenaz[];
  /** Věta pro každého živého hráče zvlášť. Cizí se ven nikdy neposílá. */
  septanda: Record<HracId, string>;
  nominace: Record<HracId, HracId>;
  kandidati: HracId[];
  hlasy: Record<HracId, HracId>;
  /** Hlasy stínů jsou veřejné stejně jako ostatní, jen se smí použít jednou. */
  hlasyStinu: Record<HracId, HracId>;
  vyhosteny: HracId | null;
  odmena: Odmena | null;
  navrhyObeti: Record<HracId, HracId>;
  obet: HracId | null;
  /** Tipy na sabotéra. Nemají vliv na hru, sčítají se do ceny Nejlepší čuch. */
  podezreli: Record<HracId, HracId>;
  /** Kdo chce ukončit rozpravu dřív. Veřejné, je to nátlak sám o sobě. */
  chtejiDal: HracId[];
}

export interface Nastaveni {
  mistrVybiraPartu: boolean;
  tajnySaboter: boolean;
  umlceniMistoVyrazeni: boolean;
}

export interface Stav {
  faze: Faze;
  hraci: Hrac[];
  /** Role zná jen server. Klientovi se posílá jen to, co smí vidět. */
  role: Record<HracId, Role>;
  predak: HracId | null;
  pocetSaboteru: number;
  limitSicht: number;
  smenyNaKolo: 1 | 2;
  nastaveni: Nastaveni;

  kolo: number;
  aktualni: Kolo | null;
  historie: Kolo[];

  /** Kdo už se podíval na svou roli. Hra nezačne, dokud to nemají všichni. */
  pripraveni: HracId[];

  /** Vražda dvakrát po sobě nejde. */
  vrazdaMinulouNoc: boolean;
  imunita: HracId | null;
  tmaNadHlasovanim: boolean;

  vitez: Tym | null;
  duvodKonce: string | null;

  /** Odpočet stojí, dokud se někdo nevrátí nebo zakladatel nerozhodne. */
  pauza: { duvod: string; kvuli: HracId } | null;
}

export type Akce =
  | { typ: 'PRIDAT_HRACE'; id: HracId; jmeno: string; zakladatel?: boolean }
  | { typ: 'ODEBRAT_HRACE'; id: HracId }
  | { typ: 'ZMENIT_NASTAVENI'; nastaveni: Partial<Nastaveni> }
  | { typ: 'ZACIT'; seed?: number }
  | { typ: 'PRIPRAVEN'; id: HracId }
  | { typ: 'VOLBA_SICHTY'; id: HracId; volba: 'makat' | 'kazit' }
  | { typ: 'NOMINOVAT'; id: HracId; cil: HracId }
  | { typ: 'HLASOVAT'; id: HracId; cil: HracId }
  | { typ: 'VYBRAT_ODMENU'; odmena: Odmena; cil?: HracId }
  | { typ: 'NAVRHNOUT_OBET'; id: HracId; cil: HracId }
  | { typ: 'PREDAK_ROZHODL'; cil: HracId }
  | { typ: 'ZAPSAT_PODEZRELEHO'; id: HracId; cil: HracId }
  | { typ: 'CHCI_DAL'; id: HracId }
  | { typ: 'DALSI_FAZE' }
  | { typ: 'ODPOJIL_SE'; id: HracId }
  | { typ: 'PRIPOJIL_SE'; id: HracId }
  | { typ: 'HRAT_BEZ_NEJ'; id: HracId };
