/** Čísla vycházejí ze simulace, viz docs/design.md §3.1 a §9. Neměnit od oka. */

export const MIN_HRACU = 5;
export const MAX_HRACU = 12;

interface Sestava {
  saboteri: number;
  limitSicht: number;
  smenyNaKolo: 1 | 2;
}

/**
 * Výsledek simulace, ne odhad. Přeměřeno po přechodu na individuální šeptandu
 * se stropem tří pravd, viz docs/design.md §9. Čísla v závorce jsou úspěšnost
 * pracantů proti botovi, který hraje dokonale z čísel a nečte lidi, takže je
 * to strop, ne očekávaná hodnota.
 *
 * Pětka je zvláštní případ a simulace na ni nestačí. S pěti hráči a jedním
 * sabotérem existuje jen pět možných světů, takže je bot nevyřeší jako strop,
 * ale jako rovnici. Jeho 94 % o skutečném stole nevypovídá nic.
 *
 * Druhé číslo u každého řádku je podíl partií, které skončí vyčerpáním limitu
 * šicht. Dřív byl limit tak vysoký, že se na něj nedošlo skoro nikdy (2 až 4 %),
 * takže bylo počítadlo "zbývá šicht" jen dekorace a sabotéři neměli druhou
 * cestu k výhře. Teď na něj dojde pětina až polovina partií.
 *
 * Rozhodovalo se proto podle jediného, co se tam měřit dá, a to je odpadávání:
 *
 *   2 sabotéři  2,4 kola, 1,5 živého z 5, 68 % partií končí vybitím stolu
 *   1 sabotér   2,0 kola, 2,6 živého z 5, končí vyhoštěním
 *
 * Se dvěma se po první vraždě stojí dva na dva a sabotéři ovládnou hlasování.
 * Jeden sabotér je možná rychle odhalený, ale u stolu zůstane sedět víc lidí.
 * Tohle chce playtest, ne další simulaci.
 */
const SESTAVY: Record<number, Sestava> = {
  5: { saboteri: 1, limitSicht: 3, smenyNaKolo: 1 },   // viz komentář výš
  6: { saboteri: 2, limitSicht: 4, smenyNaKolo: 1 },   // 48 %, limit padne v 6 %
  7: { saboteri: 2, limitSicht: 3, smenyNaKolo: 1 },   // 46 %, limit padne v 33 %
  8: { saboteri: 2, limitSicht: 3, smenyNaKolo: 1 },   // 44 %, limit padne v 54 %
  9: { saboteri: 3, limitSicht: 5, smenyNaKolo: 2 },   // 44 %, limit padne v 11 %
  10: { saboteri: 3, limitSicht: 5, smenyNaKolo: 1 },  // 44 %, limit padne v 21 %
  11: { saboteri: 3, limitSicht: 5, smenyNaKolo: 1 },  // 44 %, limit padne v 33 %
  12: { saboteri: 4, limitSicht: 6, smenyNaKolo: 2 },  // 41 %, limit padne v 20 %
};

/** Pětka se dá hrát, ale vyvážit nejde. Stůl si to zaslouží vědět dopředu. */
export function jeDivokaSestava(pocetHracu: number): boolean {
  return pocetHracu === 5;
}
export function sestavaPro(pocetHracu: number): Sestava {
  const s = SESTAVY[pocetHracu];
  if (!s) throw new Error(`Šichta se hraje od ${MIN_HRACU} do ${MAX_HRACU} hráčů, ne ${pocetHracu}.`);
  return s;
}

export function jeKratkaSichta(pocetHracu: number): boolean {
  return sestavaPro(pocetHracu).smenyNaKolo === 1;
}

/**
 * Parta je zhruba půl stolu a nikdy to není celý živý stůl. Kdyby šli všichni,
 * počet sabotáží by byl úplná informace.
 */
export function velikostParty(zivych: number): number {
  return Math.max(1, Math.min(Math.ceil(zivych / 2), zivych - 1));
}

/** Délky fází v sekundách. Škálují s počtem hráčů, protože mluvit musí každý. */
export function delkaFaze(faze: string, pocetZivych: number): number {
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
    case 'rozprava':
      return pocetZivych <= 6 ? 180 : pocetZivych <= 9 ? 240 : 300;
    case 'nominace':
      return 60;
    case 'kandidati':
      return 15;
    case 'posledni_slovo':
      return 30;
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
