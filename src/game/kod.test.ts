import { describe, expect, it } from 'vitest';
import { ABECEDA_KODU, DELKA_KODU, novyKod, platnyKod } from './kod';

/**
 * Kód se ťuká do mřížky, ne na klávesnici. Když generátor vyrobí znak, který
 * v mřížce není, místnost se nedá zadat a online režim je k ničemu. Jednou se
 * to už stalo, tyhle testy to hlídají.
 */
describe('Kód místnosti', () => {
  it('abeceda neobsahuje znaky, co se přes stůl pletou', () => {
    for (const z of 'IOQ01') expect(ABECEDA_KODU).not.toContain(z);
  });

  it('generátor nevyrobí znak mimo abecedu', () => {
    for (let i = 0; i < 2000; i++) {
      const k = novyKod();
      expect(k).toHaveLength(DELKA_KODU);
      expect(platnyKod(k)).toBe(true);
    }
  });

  it('kód z odkazu se bere i malými písmeny', () => {
    expect(platnyKod('abcd23')).toBe(true);
    expect(platnyKod('ABCD23')).toBe(true);
  });

  it('odmítne kód se znakem, který mřížka nemá', () => {
    expect(platnyKod('ABCD2I')).toBe(false);
    expect(platnyKod('ABCD2')).toBe(false);
    expect(platnyKod('ABCD234')).toBe(false);
  });
});
