/**
 * Šichta — datové typy hry. Pravidla popisuje docs/design.md, čísla sestav
 * drží src/game/rules.ts a ta jsou zdroj pravdy.
 */

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
  /**
   * Zakladatel rozhodl, že se hraje bez něj. Odpojený hráč pak nedrží
   * pauzu a fáze na něj nečeká. Návrat to zase zruší.
   */
  bezNej: boolean;
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

/**
 * Tvrzení šeptandy jako data. Čeština se z něj teprve skládá, takže
 * pravdivost jde ověřit nezávisle na překladu.
 */
export type Tvrzeni =
  /** Ne všichni jmenovaní jsou sabotéři. Aspoň jeden z nich maká poctivě. */
  | { typ: 'nejsou_vsichni'; kdo: HracId[] }
  /** Mezi jmenovanými je aspoň jeden sabotér. */
  | { typ: 'aspon_jeden'; kdo: HracId[] }
  /** Jmenovaný sabotér není. Nejsilnější, co šeptanda umí. */
  | { typ: 'cisty'; kdo: HracId }
  /** Kolik sabotérů v tom kole nominovalo. */
  | { typ: 'nominovalo'; kolo: number; pocet: number }
  /** Aspoň jeden sabotér dal v tom kole hlas tomuhle jménu. */
  | { typ: 'hlas'; kolo: number; cil: HracId }
  /** Byl předák v partě na tu šichtu? */
  | { typ: 'predak'; kolo: number; byl: boolean }
  /** Prošlá šichta, ve které přesto sabotér byl. */
  | { typ: 'tichy_saboter'; kolo: number };

export interface Kolo {
  cislo: number;
  smeny: Smenaz[];
  /**
   * Pravdy rozdané za prošlou šichtu, jako data. Drží se kvůli protokolu
   * partie a kvůli tomu, aby se vzácné rodiny (předák) neopakovaly.
   */
  pravdy: Tvrzeni[];
  /** Věta pro každého živého hráče zvlášť. Cizí se ven nikdy neposílá. */
  septanda: Record<HracId, string>;
  nominace: Record<HracId, HracId>;
  kandidati: HracId[];
  /** Kdo z kandidátů má právě poslední slovo. Index do `kandidati`. */
  mluvi: number;
  /** Kdo měl v téhle radě imunitu z noci. Veřejné. */
  imunni: HracId | null;
  /** Byla nad touhle radou tma. Hlasy se pak neodhalí až do konce hry. */
  tma: boolean;
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
  /**
   * Kdo vědomě nenominoval, respektive se zdržel hlasování.
   *
   * Nestačí koukat na prázdné místo v nominacích: stůl musí poznat rozdíl
   * mezi "rozhodl se nikoho nenavrhnout" a "ještě neodevzdal". Jinak se na
   * něj čeká a počty odevzdaných lžou.
   */
  beznominace: HracId[];
  zdrzeliSe: HracId[];
}

/**
 * Volby, které se nastavují před rozdáním rolí a pak už se nemění.
 *
 * Jsou tu jen věci, které jsou opravdu postavené. Nápady pro v2 a v3
 * (tajný sabotér, umlčení místo vyřazení, předák vybírá partu) sem patřit
 * budou, až budou fungovat, ne dřív.
 */
export interface Nastaveni {
  /**
   * Dostane šeptandu i sabotér?
   *
   * `true` (výchozí): dostanou ji všichni. Sabotérovi je k ničemu, protože
   * role zná, takže si musí vymyslet jinou. Nikdo se nedá chytit na to,
   * že "žádnou nemá".
   *
   * `false` je špionská varianta: sabotér nedostane nic a musí si vymyslet
   * i to, že nějakou má. Je to ostřejší, ale nebezpečnější, protože stačí
   * jednou zaváhat. Do dvojice s tím se hodí vypnout vraždy, jinak pracanti
   * odpadají rychleji, než stihnou lháře nachytat.
   */
  septandaProSabotery: boolean;
  /**
   * Smí sabotéři vraždit?
   *
   * Vypnuto znamená, že se odchází jen vyhoštěním. Hra je delší, u stolu
   * zůstane sedět víc lidí a častěji dojde na limit šicht. Sabotéři tím
   * přicházejí o nejsilnější odměnu, takže se to hodí tam, kde mají navrch.
   */
  vrazdy: boolean;
}

/**
 * Odpočet stojí, dokud se někdo nevrátí nebo zakladatel nerozhodne.
 * `od` a `zbyva` doplňuje server, reducer hodiny nemá.
 */
export interface Pauza {
  duvod: string;
  kvuli: HracId;
  /** Čas serveru (ms), kdy pauza začala. */
  od: number | null;
  /** Kolik ms fáze zbývalo, až se bude pokračovat. */
  zbyva: number | null;
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

  /**
   * Vražda nejde dvě kola po sobě. Počítá se v kolech, ne v nocích:
   * prošlá šichta mezi dvěma vraždami stačí. Tak to měřila simulace.
   */
  vrazdaMinuleKolo: boolean;
  /** Odměny z noci, které čekají na nejbližší radu. Spotřebují se tam. */
  imunita: HracId | null;
  tmaPristiRady: boolean;

  vitez: Tym | null;
  duvodKonce: string | null;

  pauza: Pauza | null;

  /**
   * Čas serveru (ms), kdy končí běžící fáze. Nastavuje worker, reducer
   * hodiny nemá. Na jednom telefonu null, tam odpočítává zařízení samo.
   */
  konecFaze: number | null;
  /**
   * Náhodný identifikátor partie. Klíčuje soukromý zápisník v telefonu,
   * aby si dvě partie nepletly poznámky. Nikdy z něj nejde nic odvodit.
   */
  partie: string | null;
}

export type Akce =
  | { typ: 'PRIDAT_HRACE'; id: HracId; jmeno: string; zakladatel?: boolean }
  | { typ: 'ODEBRAT_HRACE'; id: HracId }
  | { typ: 'ZMENIT_NASTAVENI'; nastaveni: Partial<Nastaveni> }
  | { typ: 'ZACIT'; seed?: number; partie?: string }
  | { typ: 'PRIPRAVEN'; id: HracId }
  | { typ: 'VOLBA_SICHTY'; id: HracId; volba: 'makat' | 'kazit' }
  | { typ: 'NOMINOVAT'; id: HracId; cil: HracId }
  | { typ: 'HLASOVAT'; id: HracId; cil: HracId }
  | { typ: 'VYBRAT_ODMENU'; odmena: Odmena; cil?: HracId }
  | { typ: 'NAVRHNOUT_OBET'; id: HracId; cil: HracId }
  | { typ: 'PREDAK_ROZHODL'; cil: HracId }
  | { typ: 'ZAPSAT_PODEZRELEHO'; id: HracId; cil: HracId }
  | { typ: 'CHCI_DAL'; id: HracId }
  | { typ: 'NENOMINUJU'; id: HracId }
  | { typ: 'ZDRZUJU_SE'; id: HracId }
  | { typ: 'DALSI_FAZE' }
  | { typ: 'ODPOJIL_SE'; id: HracId }
  | { typ: 'PRIPOJIL_SE'; id: HracId }
  | { typ: 'HRAT_BEZ_NEJ'; id: HracId }
  /** Stejná parta znovu: zpátky do šatny, role se rozdají nanovo. */
  | { typ: 'ZNOVU' };
