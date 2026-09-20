/**
 * Kód místnosti. Jediné místo, kde je napsaná abeceda.
 *
 * Proč tak málo znaků: kód se nepíše na klávesnici, ale ťuká do mřížky na
 * obrazovce, a ta se musí vejít na telefon s palcem. Šestnáct velkých tlačítek
 * je strop. Pokud by abeceda a mřížka žily každá jinde, dřív nebo později by
 * generátor vyrobil znak, který se nedá zadat, což se jednou už stalo.
 *
 * Vynechané je I, O, Q, 0 a 1: přes stůl se to plete.
 */

export const ABECEDA_KODU = 'ABCDEFGH23456789';
export const DELKA_KODU = 6;

export function platnyKod(x: string): boolean {
  const k = x.toUpperCase();
  return k.length === DELKA_KODU && [...k].every((z) => ABECEDA_KODU.includes(z));
}

/** 16^6 je šestnáct milionů kombinací. Na jeden večer u stolu bohatě stačí. */
export function novyKod(nahoda: () => number = Math.random): string {
  let k = '';
  for (let i = 0; i < DELKA_KODU; i++) {
    k += ABECEDA_KODU[Math.floor(nahoda() * ABECEDA_KODU.length)];
  }
  return k;
}
