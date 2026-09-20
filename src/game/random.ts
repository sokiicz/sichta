/** Deterministické losování. Stejný seed dá stejnou hru, což jde testovat. */

export interface Rng {
  (): number;
}

export function rng(seed: number): Rng {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 0x100000000;
  };
}

export function vyber<T>(pole: readonly T[], kolik: number, r: Rng): T[] {
  const kopie = pole.slice();
  for (let i = kopie.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    const a = kopie[i]!;
    kopie[i] = kopie[j]!;
    kopie[j] = a;
  }
  return kopie.slice(0, kolik);
}

export function jeden<T>(pole: readonly T[], r: Rng): T {
  if (pole.length === 0) throw new Error('Prázdné pole nemá z čeho vybrat.');
  return pole[Math.floor(r() * pole.length)]!;
}
