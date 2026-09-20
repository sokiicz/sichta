/**
 * Zdroj pravdy pro sestavy. Čísla vycházejí ze simulace, viz docs/design.md
 * §3.1 a §9 a `docs/balance-sim.mjs`. Neměnit od oka.
 */

export const MIN_HRACU = 5;
export const MAX_HRACU = 12;

interface Sestava {
  saboteri: number;
  limitSicht: number;
  smenyNaKolo: 1 | 2;
}

/**
 * Přeměřeno 2026-09-20 na jednu směnu za kolo, strop tří pravd v šeptandě,
 * 3000 až 5000 partií na sestavu (`scratch/jedna-smena.mjs`). První číslo
 * v komentáři je úspěšnost pracantů proti botovi, který hraje dokonale
 * z čísel a nečte lidi, takže je to strop, ne očekávaná hodnota. Druhé je
 * podíl partií, které skončí vyčerpáním limitu šicht.
 *
 * Dvě směny za kolo (`smenyNaKolo: 2`) zůstávají v kódu jako experiment,
 * ale žádná sestava je nepoužívá: bez odměny za padlou dopolední směnu jsou
 * jen druhou stopou zdarma a stojí přes minutu telefonu v ruce navíc. Tempo
 * úbytku drží nabídka odměn a to, že vražda nejde dvě kola po sobě.
 *
 * Pětka je zvláštní případ a simulace na ni nestačí. S pěti hráči a jedním
 * sabotérem existuje jen pět možných světů, takže je bot nevyřeší jako strop,
 * ale jako rovnici. Rozhodovalo se proto podle jediného, co se tam měřit dá,
 * a to je odpadávání: se dvěma sabotéry se po první vraždě stojí dva na dva
 * a sabotéři ovládnou hlasování. Jeden sabotér je možná rychle odhalený, ale
 * u stolu zůstane sedět víc lidí. Šeptanda mu při pěti nedává větu "určitě
 * není sabotér", jinak by partii vyřešila za dvě kola. Tohle chce playtest.
 */
const SESTAVY: Record<number, Sestava> = {
  5: { saboteri: 1, limitSicht: 3, smenyNaKolo: 1 },   // viz komentář výš
  6: { saboteri: 2, limitSicht: 4, smenyNaKolo: 1 },   // 48 %, limit padne v 6 %
  7: { saboteri: 2, limitSicht: 3, smenyNaKolo: 1 },   // 46 %, limit padne v 33 %
  8: { saboteri: 2, limitSicht: 3, smenyNaKolo: 1 },   // 44 %, limit padne v 54 %
  9: { saboteri: 3, limitSicht: 6, smenyNaKolo: 1 },   // 40 %, limit padne v 3 %
  10: { saboteri: 3, limitSicht: 5, smenyNaKolo: 1 },  // 47 %, limit padne v 20 %
  11: { saboteri: 3, limitSicht: 5, smenyNaKolo: 1 },  // 46 %, limit padne v 33 %
  12: { saboteri: 4, limitSicht: 7, smenyNaKolo: 1 },  // 38 %, limit padne v 6 %
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

/**
 * Délky fází v sekundách. Škálují s počtem hráčů, protože mluvit musí každý.
 * Jsou to stropy: fáze, ve které všichni odevzdali, končí dřív.
 */
export function delkaFaze(faze: string, pocetZivych: number, kandidatu = 2): number {
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
