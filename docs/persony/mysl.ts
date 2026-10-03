/**
 * Mysl jednoho hráče: váhy nad všemi možnými množinami sabotérů.
 *
 * Stejný princip jako bot v `docs/balance-sim.mjs`, jenže každý hráč má svou
 * vlastní mysl a stopy zpracovává nedokonale: zapomíná (`pamet`), nevyužije
 * celou sílu důkazu (`analytika` jako exponent) a při rozhodování přidává šum.
 * Takhle se z jedné a téže šichty stanou u stolu osm různých názorů.
 */

import type { Tvrzeni } from '../../src/game/types';

const CACHE = new Map<string, number[]>();

export const pop = (x: number): number => {
  let c = 0;
  while (x) { x &= x - 1; c++; }
  return c;
};

/** Všechny bitové masky o n bitech s právě s jedničkami. */
export function hypotezy(n: number, s: number): number[] {
  const klic = `${n}:${s}`;
  const hit = CACHE.get(klic);
  if (hit) return hit;
  const out: number[] = [];
  for (let m = 0; m < 1 << n; m++) if (pop(m) === s) out.push(m);
  CACHE.set(klic, out);
  return out;
}

const binom = (n: number, k: number): number => {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return r;
};

/** Co si hráči myslí o tom, jak často sabotér kazí. Stejný předpoklad jako v bot-simulátoru. */
export const predpokladKazeni = (m: number): number => (m <= 1 ? 0.85 : 1 / m);

/** Věrohodnost toho, že v partě s `m` sabotéry kazilo právě `c` lidí. */
export function verohodnostSichty(m: number, c: number): number {
  if (c > m) return 1e-4;
  if (m === 0) return c === 0 ? 1 : 1e-4;
  const q = predpokladKazeni(m);
  return Math.max(0.01, binom(m, c) * q ** c * (1 - q) ** (m - c));
}

export interface VerejneRole { get(i: number): 'pracant' | 'saboter' | undefined }

export class Mysl {
  readonly masky: number[];
  readonly logw: Float64Array;
  private cache: number[] | null = null;

  /** `ja` je index hráče, který sám sebe zná jako pracanta. Sabotér dává null. */
  constructor(readonly n: number, readonly s: number, ja: number | null) {
    this.masky = hypotezy(n, s);
    this.logw = new Float64Array(this.masky.length);
    if (ja != null) {
      for (let i = 0; i < this.masky.length; i++) {
        if ((this.masky[i]! >> ja) & 1) this.logw[i] = -Infinity;
      }
    }
  }

  /** Tvrdá podmínka: hypotézy, které jí odporují, jdou pryč. Když by nezbyla žádná, nic se nestane. */
  tvrde(plati: (m: number) => boolean): void {
    this.cache = null;
    let zije = 0;
    const stary = this.logw.slice();
    for (let i = 0; i < this.masky.length; i++) {
      if (this.logw[i] === -Infinity) continue;
      if (!plati(this.masky[i]!)) this.logw[i] = -Infinity;
      else zije++;
    }
    if (zije === 0) this.logw.set(stary);
  }

  /** Měkká stopa: věrohodnost 0 až 1, umocněná na `sila`, což je to, kolik z ní hráč využije. */
  mekke(verohodnost: (m: number) => number, sila: number): void {
    if (sila <= 0) return;
    this.cache = null;
    for (let i = 0; i < this.masky.length; i++) {
      if (this.logw[i] === -Infinity) continue;
      this.logw[i] = this.logw[i]! + sila * Math.log(Math.max(verohodnost(this.masky[i]!), 1e-4));
    }
  }

  /** Pravděpodobnost, že hráč j je sabotér. */
  marginaly(): number[] {
    if (this.cache) return this.cache;
    let max = -Infinity;
    for (let i = 0; i < this.logw.length; i++) if (this.logw[i]! > max) max = this.logw[i]!;
    const out = new Array<number>(this.n).fill(0);
    if (max === -Infinity) { this.cache = out; return out; }
    let suma = 0;
    for (let i = 0; i < this.masky.length; i++) {
      const w = Math.exp(this.logw[i]! - max);
      if (w === 0) continue;
      suma += w;
      const m = this.masky[i]!;
      for (let j = 0; j < this.n; j++) if ((m >> j) & 1) out[j]! += w;
    }
    for (let j = 0; j < this.n; j++) out[j]! /= suma;
    this.cache = out;
    return out;
  }
}

/**
 * Tvrzení šeptandy jako podmínka na množinu sabotérů. `null` znamená, že z tvrzení
 * se pro hypotézy nedá nic vyčíst (nominace jsou tajné, předák není známý).
 */
export function podminkaTvrzeni(
  t: Tvrzeni,
  idx: (id: string) => number,
  hlasyKola: (kolo: number) => { kdo: number; komu: number }[] | null,
  partaKola: (kolo: number) => number[] | null,
): ((m: number) => boolean) | null {
  switch (t.typ) {
    case 'nejsou_vsichni': {
      const bity = t.kdo.map(idx).reduce((a, i) => a | (1 << i), 0);
      return (m) => (m & bity) !== bity;
    }
    case 'aspon_jeden': {
      const bity = t.kdo.map(idx).reduce((a, i) => a | (1 << i), 0);
      return (m) => (m & bity) !== 0;
    }
    case 'cisty': {
      const b = 1 << idx(t.kdo);
      return (m) => (m & b) === 0;
    }
    case 'hlas': {
      const h = hlasyKola(t.kolo);
      if (!h) return null;
      const cil = idx(t.cil);
      const bity = h.filter((x) => x.komu === cil).reduce((a, x) => a | (1 << x.kdo), 0);
      return (m) => (m & bity) !== 0;
    }
    case 'tichy_saboter': {
      const p = partaKola(t.kolo);
      if (!p) return null;
      const bity = p.reduce((a, i) => a | (1 << i), 0);
      return (m) => (m & bity) !== 0;
    }
    case 'predak': {
      if (!t.byl) return null;
      const p = partaKola(t.kolo);
      if (!p) return null;
      const bity = p.reduce((a, i) => a | (1 << i), 0);
      return (m) => (m & bity) !== 0;
    }
    case 'nominovalo':
      return null;
  }
}

export const logit = (p: number): number => {
  const x = Math.min(0.98, Math.max(0.02, p));
  return Math.log(x / (1 - x));
};
export const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));
