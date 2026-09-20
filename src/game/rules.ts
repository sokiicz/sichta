/** Čísla vycházejí ze simulace, viz docs/design.md §3.1 a §9. Neměnit od oka. */

export const MIN_HRACU = 5;
export const MAX_HRACU = 12;

interface Sestava {
  saboteri: number;
  limitSicht: number;
  smenyNaKolo: 1 | 2;
}

const SESTAVY: Record<number, Sestava> = {
  5: { saboteri: 2, limitSicht: 4, smenyNaKolo: 1 },
  6: { saboteri: 2, limitSicht: 3, smenyNaKolo: 1 },
  7: { saboteri: 2, limitSicht: 3, smenyNaKolo: 1 },
  8: { saboteri: 3, limitSicht: 6, smenyNaKolo: 2 },
  9: { saboteri: 3, limitSicht: 5, smenyNaKolo: 2 },
  10: { saboteri: 3, limitSicht: 6, smenyNaKolo: 2 },
  11: { saboteri: 4, limitSicht: 7, smenyNaKolo: 2 },
  12: { saboteri: 4, limitSicht: 7, smenyNaKolo: 2 },
};

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
      return 12;
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
