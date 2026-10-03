/**
 * Zdroj pravdy pro sestavy. Čísla vycházejí ze simulace s dvaceti personami,
 * viz docs/simulace-persony.md a docs/persony/. Neměnit od oka.
 *
 * Co se z té simulace dozvěděli: bot, podle kterého se sestavy ladily dřív,
 * hraje dokonalou dedukci. Lidé ji nehrají a proti zkušenému sabotérovi
 * vyhrávají pracanti míň, než tabulka slibovala (29 až 38 % při 7 až 12
 * hráčích). Nejsilnější páka je limit šicht: jedno kolo navíc zvedne výhru
 * pracantů o 8 až 22 bodů. Druhá, jemnější, je délka rozpravy.
 *
 * Proto má každý stůl úroveň: u nováčků je hra pro pracanty těžší, u zkušených
 * se sabotéři umí domluvit beze slov. Pro každou úroveň je tu zvlášť limit
 * šicht a délka rozpravy, laděné na zhruba 48 % výher pracantů. Počet
 * sabotérů zůstává stejný, protože o jednoho víc nebo míň je skok o 30 až 60
 * bodů a to se ladit nedá.
 */

import type { Uroven } from './types';
export type { Uroven } from './types';

export const MIN_HRACU = 5;
export const MAX_HRACU = 12;

export const UROVNE: Uroven[] = ['zacatecnici', 'smiseny', 'zkuseni'];
export const UROVEN_VYCHOZI: Uroven = 'smiseny';

export const UROVEN_TEXT: Record<Uroven, { nazev: string; popis: string }> = {
  zacatecnici: { nazev: 'ZAČÁTEČNÍCI', popis: 'Nikdo z vás hru nezná, nebo podobné hry nehrál.' },
  smiseny: { nazev: 'SMÍŠENÝ STŮL', popis: 'Někdo hrál podobné hry, ostatní ne. Nejběžnější.' },
  zkuseni: { nazev: 'ZKUŠENÍ', popis: 'Všichni hrajete sociální dedukce pravidelně.' },
};

/** Posun limitu, který smí zakladatel zvolit. Dál už hra nedává smysl. */
export const LIMIT_POSUN_MIN = -1;
export const LIMIT_POSUN_MAX = 2;

export interface Sestava {
  saboteri: number;
  /** Limit šicht včetně posunu zvoleného zakladatelem. */
  limitSicht: number;
  /** Limit podle doporučení, bez posunu. */
  doporucenyLimit: number;
  smenyNaKolo: 1 | 2;
  /** Násobek výchozí délky rozpravy. */
  rozprava: number;
}

const SABOTERI: Record<number, number> = { 5: 1, 6: 2, 7: 2, 8: 2, 9: 3, 10: 3, 11: 3, 12: 4 };

/**
 * [limit šicht, násobek délky rozpravy] podle úrovně a počtu hráčů.
 * Měřeno 2026-10-03, 1200 až 4000 partií na políčko, cíl 48 % pro pracanty.
 * Pětka je zvláštní případ: jeden sabotér a limit 2 až 3 kola, vyvážit
 * ji nejde (viz jeDivokaSestava), takže je u zkušených tréninkově snadná.
 */
const LADENI: Record<Uroven, Record<number, [number, number]>> = {
  zacatecnici: { 5: [3, 1], 6: [6, 1], 7: [4, 1], 8: [4, 0.75], 9: [8, 1], 10: [7, 0.75], 11: [6, 1], 12: [10, 0.75] },
  smiseny: { 5: [2, 1], 6: [5, 1], 7: [4, 0.75], 8: [4, 0.75], 9: [7, 1], 10: [6, 1], 11: [6, 0.75], 12: [10, 0.75] },
  zkuseni: { 5: [2, 1], 6: [4, 1.5], 7: [4, 0.75], 8: [4, 0.75], 9: [8, 1], 10: [7, 0.75], 11: [6, 1.5], 12: [9, 1] },
};

/** Pětka se dá hrát, ale vyvážit nejde. Stůl si to zaslouží vědět dopředu. */
export function jeDivokaSestava(pocetHracu: number): boolean {
  return pocetHracu === 5;
}

const jeUroven = (x: unknown): x is Uroven => typeof x === 'string' && (UROVNE as string[]).includes(x);

/** Posun musí být celé číslo v rozsahu. Cokoli jiného (i z poškozené zprávy) je nula. */
export function cistyPosun(x: unknown): number {
  if (typeof x !== 'number' || !Number.isInteger(x)) return 0;
  return Math.min(LIMIT_POSUN_MAX, Math.max(LIMIT_POSUN_MIN, x));
}

export function cistaUroven(x: unknown): Uroven {
  return jeUroven(x) ? x : UROVEN_VYCHOZI;
}

export function sestavaPro(pocetHracu: number, uroven: Uroven = UROVEN_VYCHOZI, limitPosun = 0): Sestava {
  const saboteri = SABOTERI[pocetHracu];
  if (saboteri == null) throw new Error(`Šichta se hraje od ${MIN_HRACU} do ${MAX_HRACU} hráčů, ne ${pocetHracu}.`);
  const [doporuceny, rozprava] = LADENI[cistaUroven(uroven)][pocetHracu]!;
  return {
    saboteri,
    doporucenyLimit: doporuceny,
    // Limit pod dvěma koly není hra: jedna rada a konec.
    limitSicht: Math.max(2, doporuceny + cistyPosun(limitPosun)),
    smenyNaKolo: 1,
    rozprava,
  };
}

export function nasobekRozpravy(pocetHracu: number, uroven: Uroven = UROVEN_VYCHOZI): number {
  return sestavaPro(pocetHracu, uroven).rozprava;
}

export function jeKratkaSichta(pocetHracu: number): boolean {
  return sestavaPro(pocetHracu).smenyNaKolo === 1;
}

/**
 * Odhad ze simulace: kolik partií vyhrají pracanti a jak dlouho trvá, když
 * se limit posune o -1, 0, +1, +2 kola proti doporučení. Je to odhad pro
 * stůl typický pro danou úroveň. Skutečný stůl se od něj liší o to víc,
 * čím víc se od typu liší, ale o směru a velikosti kroku to říká dost.
 * Pole: [podíl výher pracantů 0 až 1, minut].
 */
const ODHAD: Record<Uroven, Record<number, Record<number, [number, number]>>> = {
  zacatecnici: {
    5: { '-1': [0.5, 14], '0': [0.75, 17], '1': [0.89, 19], '2': [0.93, 20] },
    6: { '-1': [0.43, 30], '0': [0.47, 31], '1': [0.49, 32], '2': [0.5, 32] },
    7: { '-1': [0.22, 24], '0': [0.41, 30], '1': [0.55, 33], '2': [0.62, 35] },
    8: { '-1': [0.27, 23], '0': [0.5, 28], '1': [0.68, 31], '2': [0.78, 33] },
    9: { '-1': [0.41, 48], '0': [0.45, 49], '1': [0.47, 49], '2': [0.48, 49] },
    10: { '-1': [0.41, 44], '0': [0.51, 47], '1': [0.57, 48], '2': [0.61, 49] },
    11: { '-1': [0.31, 46], '0': [0.48, 51], '1': [0.61, 55], '2': [0.69, 57] },
    12: { '-1': [0.42, 61], '0': [0.45, 62], '1': [0.47, 63], '2': [0.47, 63] },
  },
  smiseny: {
    5: { '-1': [0.63, 13], '0': [0.63, 13], '1': [0.86, 16], '2': [0.94, 17] },
    6: { '-1': [0.45, 27], '0': [0.55, 29], '1': [0.58, 30], '2': [0.6, 31] },
    7: { '-1': [0.3, 21], '0': [0.5, 26], '1': [0.64, 28], '2': [0.7, 30] },
    8: { '-1': [0.34, 22], '0': [0.56, 26], '1': [0.74, 29], '2': [0.83, 30] },
    9: { '-1': [0.39, 45], '0': [0.47, 47], '1': [0.51, 48], '2': [0.53, 49] },
    10: { '-1': [0.33, 43], '0': [0.46, 48], '1': [0.57, 51], '2': [0.64, 52] },
    11: { '-1': [0.35, 40], '0': [0.5, 45], '1': [0.62, 48], '2': [0.69, 50] },
    12: { '-1': [0.46, 61], '0': [0.5, 62], '1': [0.52, 62], '2': [0.53, 63] },
  },
  zkuseni: {
    5: { '-1': [0.59, 13], '0': [0.59, 13], '1': [0.88, 15], '2': [0.96, 16] },
    6: { '-1': [0.32, 25], '0': [0.51, 30], '1': [0.62, 32], '2': [0.66, 34] },
    7: { '-1': [0.28, 20], '0': [0.47, 25], '1': [0.63, 27], '2': [0.7, 28] },
    8: { '-1': [0.33, 21], '0': [0.53, 25], '1': [0.72, 28], '2': [0.81, 29] },
    9: { '-1': [0.45, 46], '0': [0.5, 47], '1': [0.53, 48], '2': [0.53, 48] },
    10: { '-1': [0.41, 41], '0': [0.54, 44], '1': [0.62, 46], '2': [0.65, 46] },
    11: { '-1': [0.31, 52], '0': [0.45, 58], '1': [0.59, 63], '2': [0.68, 65] },
    12: { '-1': [0.38, 65], '0': [0.48, 67], '1': [0.52, 69], '2': [0.56, 69] },
  },
};

export function odhadPro(
  pocetHracu: number, uroven: Uroven, limitPosun: number,
): { pracanti: number; minut: number } | null {
  const x = ODHAD[uroven]?.[pocetHracu]?.[cistyPosun(limitPosun)];
  return x ? { pracanti: x[0], minut: x[1] } : null;
}

/**
 * Parta je zhruba půl stolu a nikdy to není celý živý stůl. Kdyby šli všichni,
 * počet sabotáží by byl úplná informace.
 */
export function velikostParty(zivych: number): number {
  return Math.max(1, Math.min(Math.ceil(zivych / 2), zivych - 1));
}

/**
 * Délky fází v sekundách. Škálují s počtem hráčů, protože mluvit musí každý.
 * Jsou to stropy: fáze, ve které všichni odevzdali, končí dřív.
 * `rozprava` je násobek délky rozpravy podle úrovně stolu.
 */
export function delkaFaze(faze: string, pocetZivych: number, kandidatu = 2, rozprava = 1): number {
  switch (faze) {
    case 'predel':
      return 2;
    case 'zadani':
      return 15;
    case 'sichta':
      return 45;
    case 'vysledek':
      // Tohle je jediný tvrdý důkaz v celém kole a musí se zapamatovat: kdo
      // byl v partě a kolik jich kazilo. Dvanáct vteřin na to nestačilo.
      return 22;
    case 'septanda':
      return 20;
    case 'rozprava': {
      const zaklad = pocetZivych <= 6 ? 180 : pocetZivych <= 9 ? 240 : 300;
      return Math.max(30, Math.round((zaklad * rozprava) / 5) * 5);
    }
    case 'nominace':
      return 60;
    case 'kandidati':
      return 15;
    case 'posledni_slovo':
      // Každý kandidát dostane slovo zvlášť. Při remíze jich může být víc než
      // dva, pak se čas na hlavu zkrátí, ať rada nečeká přes dvě minuty.
      return kandidatu > 2 ? 20 : 30;
    case 'rada':
      return 45;
    case 'hlasy':
      return 18;
    case 'vyhosteni':
      return 15;
    case 'noc':
      return 60;
    case 'rano':
      return 15;
    default:
      return 0;
  }
}
