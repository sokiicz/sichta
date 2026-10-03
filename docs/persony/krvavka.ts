/**
 * Blood on the Clocktower, scénář Trouble Brewing, odehraný stejnými personami.
 *
 * Slouží k jednomu: srovnat vyváženost Šichty s hrou, která je u komunity i
 * u autorů považovaná za vyváženou (autoři uvádějí zhruba 50 : 50 z ~570
 * zaznamenaných partií). Když model person dá Krvavce kolem poloviny, je
 * k věření i u Šichty. Když ne, chybuje model, ne hra.
 *
 * Pravidla jsou implementovaná podle scénáře Trouble Brewing: 22 rolí, sestavy
 * 5 až 12 hráčů, noční informace, nominace, hlasování s hlasy duchů, poprava,
 * Panna, Zabiják, Imp s předáním, Šarlatová žena, Baron. Vypravěč je
 * neutrální: o falešných informacích, červených sledech a bluzích rozhoduje
 * náhoda. Rozhodování hráčů používá tytéž rysy jako v `hra.ts`.
 *
 * Zjednodušení: Špión vidí grimoár jen tak, že zná všechny role, Komorník
 * hlasuje jen po pánovi, Poustevník a Špión se tváří jako druhá strana
 * s pravděpodobností 0,5 u každého dotazu, soukromé rozhovory jsou nahrazené
 * veřejným sdílením informací.
 */

import { rng } from '../../src/game/random';
import { logit, pop, sigmoid } from './mysl';
import { upravRysy } from './hra';
import type { Persona, Rysy, Uprava } from './persony';

// ---------------------------------------------------------------- role

export type Role =
  | 'washerwoman' | 'librarian' | 'investigator' | 'chef' | 'empath' | 'fortuneteller' | 'undertaker'
  | 'monk' | 'ravenkeeper' | 'virgin' | 'slayer' | 'soldier' | 'mayor'
  | 'butler' | 'drunk' | 'recluse' | 'saint'
  | 'poisoner' | 'spy' | 'scarletwoman' | 'baron'
  | 'imp';

const TOWN: Role[] = ['washerwoman', 'librarian', 'investigator', 'chef', 'empath', 'fortuneteller', 'undertaker', 'monk', 'ravenkeeper', 'virgin', 'slayer', 'soldier', 'mayor'];
const OUT: Role[] = ['butler', 'drunk', 'recluse', 'saint'];
const MINIONS: Role[] = ['poisoner', 'spy', 'scarletwoman', 'baron'];
/** Townsfolk, outsideři, přisluhovači podle počtu hráčů. */
const POCTY: Record<number, [number, number, number]> = {
  5: [3, 0, 1], 6: [3, 1, 1], 7: [5, 0, 1], 8: [5, 1, 1], 9: [5, 2, 1], 10: [7, 0, 2], 11: [7, 1, 2], 12: [7, 2, 2],
};
const INFO_ROLE = new Set<Role>(['washerwoman', 'librarian', 'investigator', 'chef', 'empath', 'fortuneteller', 'undertaker']);

const jeTown = (r: Role) => TOWN.includes(r);
const jeOut = (r: Role) => OUT.includes(r);
const jeMinion = (r: Role) => MINIONS.includes(r);
const jeZlaRole = (r: Role) => jeMinion(r) || r === 'imp';

export function pocetSabotuKrvavka(n: number) { return POCTY[n]![2] + 1; }

// ---------------------------------------------------------------- parametry

export interface ParametryK {
  detekce: number;
  lhani: number;
  presvedcovani: number;
  sum: number;
  /** Důvěřivost k tvrzením ostatních. */
  duvera: number;
  /** Jak často zlí bluffují, když mluví. */
  klam: number;
  /** Délka denní rozpravy jako násobek výchozí. */
  rozprava: number;
}
export const VYCHOZI_K: ParametryK = { detekce: 1, lhani: 1, presvedcovani: 1, sum: 1, duvera: 1, klam: 1, rozprava: 1 };

export interface ZadaniK {
  osoby: Persona[];
  pritele?: [number, number][];
  uprava?: Uprava;
  seed: number;
  knob?: Partial<ParametryK>;
  /** Indexy sedadel, které budou zlé (první je démon). Role v rámci týmu se losují. */
  zli?: number[];
  rysy?: Rysy[];
  trace?: (z: string) => void;
}

export interface HracK {
  persona: string;
  role: Role;
  zly: boolean;
  vyhral: boolean;
  zivyNaKonci: boolean;
  popraven: boolean;
  zabit: boolean;
}

export interface VysledekK {
  n: number;
  zlych: number;
  vitez: 'dobri' | 'zli';
  duvod: string;
  dni: number;
  sekundy: number;
  popravenoDobrych: number;
  popravenoZlych: number;
  nocnichVrazd: number;
  dnuBezPopravy: number;
  nominaci: number;
  hraci: HracK[];
  rysy: Rysy[];
}

// ---------------------------------------------------------------- informace

type Info =
  | { typ: 'wash'; a: number; b: number; role: Role }
  | { typ: 'lib'; a: number; b: number; role: Role }
  | { typ: 'lib0' }
  | { typ: 'inv'; a: number; b: number; role: Role }
  | { typ: 'chef'; k: number }
  | { typ: 'empath'; k: number; nb: number[] }
  | { typ: 'ft'; a: number; b: number; ano: boolean }
  | { typ: 'ut'; kdo: number; role: Role }
  | { typ: 'raven'; kdo: number; role: Role };

/** Hypotéza: kdo je zlý (maska) a kdo je démon. */
interface Hyp { mask: number; dem: number }

class MyslK {
  readonly h: Hyp[] = [];
  readonly logw: Float64Array;
  private cache: { zly: number[]; dem: number[] } | null = null;

  constructor(readonly n: number, readonly zlych: number, ja: number | null) {
    for (let m = 0; m < 1 << n; m++) {
      if (pop(m) !== zlych) continue;
      for (let d = 0; d < n; d++) if ((m >> d) & 1) this.h.push({ mask: m, dem: d });
    }
    this.logw = new Float64Array(this.h.length);
    if (ja != null) for (let i = 0; i < this.h.length; i++) if ((this.h[i]!.mask >> ja) & 1) this.logw[i] = -Infinity;
  }

  tvrde(plati: (h: Hyp) => boolean) {
    this.cache = null;
    const stary = this.logw.slice();
    let zije = 0;
    for (let i = 0; i < this.h.length; i++) {
      if (this.logw[i] === -Infinity) continue;
      if (!plati(this.h[i]!)) this.logw[i] = -Infinity; else zije++;
    }
    if (zije === 0) this.logw.set(stary);
  }

  mekke(lik: (h: Hyp) => number, sila: number) {
    if (sila <= 0) return;
    this.cache = null;
    for (let i = 0; i < this.h.length; i++) {
      if (this.logw[i] === -Infinity) continue;
      this.logw[i] = this.logw[i]! + sila * Math.log(Math.max(lik(this.h[i]!), 1e-4));
    }
  }

  marg() {
    if (this.cache) return this.cache;
    let max = -Infinity;
    for (let i = 0; i < this.logw.length; i++) if (this.logw[i]! > max) max = this.logw[i]!;
    const zly = new Array<number>(this.n).fill(0);
    const dem = new Array<number>(this.n).fill(0);
    if (max > -Infinity) {
      let s = 0;
      for (let i = 0; i < this.h.length; i++) {
        const w = Math.exp(this.logw[i]! - max);
        if (w === 0) continue;
        s += w;
        const hh = this.h[i]!;
        for (let j = 0; j < this.n; j++) if ((hh.mask >> j) & 1) zly[j]! += w;
        dem[hh.dem]! += w;
      }
      for (let j = 0; j < this.n; j++) { zly[j]! /= s; dem[j]! /= s; }
    }
    this.cache = { zly, dem };
    return this.cache;
  }
}

// ---------------------------------------------------------------- hráč

interface P {
  i: number;
  persona: Persona;
  r: Rysy;
  role: Role;
  /** Co si hráč myslí, že je. Opilec si myslí, že je Townsfolk. */
  videny: Role;
  zly: boolean;
  zivy: boolean;
  duch: boolean;
  otraven: boolean;
  mysl: MyslK;
  soc: number[];
  zloba: number[];
  sumDen: number[];
  pritel: number | null;
  info: Info[];
  panna: boolean;
  zabijak: boolean;
  pan: number | null;
  nominoval: boolean;
  nominovan: boolean;
  /** Co už hráč řekl nahlas. */
  rekl: number;
  tvrdiRoli: Role | null;
  tvrdiInfo: Info[];
}

const zaklad = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));

// ---------------------------------------------------------------- hra

export function hrajKrvavku(z: ZadaniK): VysledekK {
  const K: ParametryK = { ...VYCHOZI_K, ...z.knob };
  const n = z.osoby.length;
  const R = rng(((z.seed * 2654435761) ^ 0x7f4a7c15) >>> 0);
  const coin = (p: number) => R() < p;
  const gauss = () => Math.sqrt(-2 * Math.log(Math.max(R(), 1e-12))) * Math.cos(2 * Math.PI * R());
  const pickOf = <T,>(a: T[]): T => a[Math.floor(R() * a.length)]!;
  const sampleOf = <T,>(a: T[], k: number): T[] => {
    const c = a.slice();
    const o: T[] = [];
    while (o.length < k && c.length) o.push(c.splice(Math.floor(R() * c.length), 1)[0]!);
    return o;
  };
  const trace = z.trace ?? (() => {});

  // ---- sestava
  const [t0, o0, m0] = POCTY[n]!;
  const minioni = sampleOf(MINIONS, m0);
  const baron = minioni.includes('baron');
  const pocetOut = o0 + (baron ? 2 : 0);
  const pocetTown = t0 - (baron ? 2 : 0);
  const outsideri = sampleOf(OUT, pocetOut);
  const townsfolk = sampleOf(TOWN, pocetTown);
  let opilecVidi: Role | null = null;
  if (outsideri.includes('drunk')) {
    const zbyle = TOWN.filter((r) => !townsfolk.includes(r));
    opilecVidi = pickOf(zbyle);
  }
  const zivotRole: Role[] = [...townsfolk, ...outsideri, ...minioni, 'imp'];
  const sedadla = Array.from({ length: n }, (_, i) => i).sort(() => R() - 0.5);
  const roleSedadla: Role[] = new Array<Role>(n);
  if (z.zli) {
    // vynucení zlého týmu: démon je první, zbytek přisluhovači, dobří se rozdělí na zbylá sedadla
    const dobreRole = [...townsfolk, ...outsideri];
    const dobreSedadla = Array.from({ length: n }, (_, i) => i).filter((i) => !z.zli!.includes(i)).sort(() => R() - 0.5);
    roleSedadla[z.zli[0]!] = 'imp';
    z.zli.slice(1).forEach((s, k) => { roleSedadla[s] = minioni[k]!; });
    dobreSedadla.forEach((s, k) => { roleSedadla[s] = dobreRole[k]!; });
  } else {
    sedadla.forEach((s, k) => { roleSedadla[s] = zivotRole[k]!; });
  }
  const zlychCelkem = m0 + 1;
  const dobrychVHre = new Set<Role>([...townsfolk, ...outsideri]);
  const bluffy = sampleOf([...TOWN, ...OUT].filter((r) => !dobrychVHre.has(r) && r !== opilecVidi), 3);
  const dobreSedadlaIdx = roleSedadla.map((r, i) => (jeZlaRole(r) ? -1 : i)).filter((i) => i >= 0);
  const herring = roleSedadla.includes('fortuneteller') ? pickOf(dobreSedadlaIdx) : -1;

  const pritel = new Map<number, number>();
  for (const [a, b] of z.pritele ?? []) { pritel.set(a, b); pritel.set(b, a); }
  const H: P[] = z.osoby.map((persona, i) => {
    const role = roleSedadla[i]!;
    const zly = jeZlaRole(role);
    return {
      i, persona, r: z.rysy?.[i] ?? upravRysy(persona.rysy, z.uprava), role,
      videny: role === 'drunk' ? opilecVidi! : role, zly, zivy: true, duch: false, otraven: false,
      mysl: new MyslK(n, zlychCelkem, zly ? null : i),
      soc: new Array(n).fill(0), zloba: new Array(n).fill(0), sumDen: new Array(n).fill(0),
      pritel: pritel.get(i) ?? null, info: [], panna: role === 'virgin', zabijak: role === 'slayer',
      pan: null, nominoval: false, nominovan: false, rekl: 0, tvrdiRoli: null, tvrdiInfo: [],
    };
  });

  // ---- pomocné
  const zivi = () => H.filter((h) => h.zivy).map((h) => h.i);
  const stiha = (h: P) => coin(h.r.pozornost ** 0.6);
  const vyuziti = (h: P) => 0.3 + 0.7 * h.r.analytika;
  const zapamatuje = (h: P) => 0.65 + 0.35 * h.r.pamet;
  const demon = () => H.find((h) => h.role === 'imp' && h.zivy) ?? null;
  const malf = (h: P) => h.role === 'drunk' || h.otraven;
  /** Za koho se hráč jeví při dotazu vypravěče. Poustevník občas za zlého, Špión občas za dobrého. */
  const jeviSeZly = (x: P): boolean => {
    if (x.role === 'recluse') return coin(0.5);
    if (x.role === 'spy') return coin(0.5) ? false : true;
    return x.zly;
  };
  const jeviSeDemon = (x: P): boolean => x.role === 'imp' || (x.role === 'recluse' && coin(0.3));
  const sousedi = (i: number): number[] => {
    const o: number[] = [];
    for (const smer of [-1, 1]) {
      for (let k = 1; k < n; k++) {
        const j = (i + smer * k + n * k) % n;
        if (H[j]!.zivy && j !== i) { o.push(j); break; }
      }
    }
    return [...new Set(o)];
  };

  // ---------------------------------------------------------------- generátory informací

  function infoPro(h: P, role: Role, dnesPopraveny: number | null): Info | null {
    const m = malf(h);
    const ostatni = H.filter((x) => x.i !== h.i);
    switch (role) {
      case 'washerwoman': {
        const mozni = ostatni.filter((x) => jeTown(x.role) && x.role !== 'drunk');
        const dec = pickOf(ostatni);
        if (m || !mozni.length) { const a = pickOf(ostatni); return { typ: 'wash', a: a.i, b: pickOf(ostatni.filter((x) => x.i !== a.i)).i, role: pickOf(TOWN) }; }
        const w = pickOf(mozni);
        const d2 = pickOf(ostatni.filter((x) => x.i !== w.i)) ?? dec;
        return coin(0.5) ? { typ: 'wash', a: w.i, b: d2.i, role: w.role } : { typ: 'wash', a: d2.i, b: w.i, role: w.role };
      }
      case 'librarian': {
        const mozni = ostatni.filter((x) => jeOut(x.role));
        if (m) { const a = pickOf(ostatni); return { typ: 'lib', a: a.i, b: pickOf(ostatni.filter((x) => x.i !== a.i)).i, role: pickOf(OUT) }; }
        if (!mozni.length) return { typ: 'lib0' };
        const w = pickOf(mozni);
        const d2 = pickOf(ostatni.filter((x) => x.i !== w.i));
        return coin(0.5) ? { typ: 'lib', a: w.i, b: d2.i, role: w.role } : { typ: 'lib', a: d2.i, b: w.i, role: w.role };
      }
      case 'investigator': {
        const mozni = ostatni.filter((x) => jeMinion(x.role) || (x.role === 'recluse' && coin(0.3)));
        if (m || !mozni.length) { const a = pickOf(ostatni); return { typ: 'inv', a: a.i, b: pickOf(ostatni.filter((x) => x.i !== a.i)).i, role: pickOf(MINIONS) }; }
        const w = pickOf(mozni);
        const d2 = pickOf(ostatni.filter((x) => x.i !== w.i));
        return coin(0.5) ? { typ: 'inv', a: w.i, b: d2.i, role: jeMinion(w.role) ? w.role : pickOf(MINIONS) } : { typ: 'inv', a: d2.i, b: w.i, role: jeMinion(w.role) ? w.role : pickOf(MINIONS) };
      }
      case 'chef': {
        let k = 0;
        const zly = H.map((x) => jeviSeZly(x));
        for (let i = 0; i < n; i++) if (zly[i] && zly[(i + 1) % n]) k++;
        return { typ: 'chef', k: m ? pickOf([0, 1, 2]) : k };
      }
      case 'empath': {
        const nb = sousedi(h.i);
        const k = nb.filter((j) => jeviSeZly(H[j]!)).length;
        return { typ: 'empath', k: m ? pickOf([0, 1, 2]) : k, nb };
      }
      case 'fortuneteller': {
        // věštkyně testuje dva nejpodezřelejší, nezkušená dva náhodné
        const kruh = ostatni.filter((x) => x.zivy);
        if (kruh.length < 2) return null;
        let a: P, b: P;
        if (coin(0.4 + 0.5 * h.r.analytika)) {
          const mg = h.mysl.marg().zly;
          const s = kruh.slice().sort((x, y) => (mg[y.i]! + R() * 0.1) - (mg[x.i]! + R() * 0.1));
          a = s[0]!; b = s[1]!;
        } else { [a, b] = sampleOf(kruh, 2) as [P, P]; }
        const ano = (jeviSeDemon(a) || jeviSeDemon(b) || a.i === herring || b.i === herring);
        return { typ: 'ft', a: a.i, b: b.i, ano: m ? coin(0.5) : ano };
      }
      case 'undertaker': {
        if (dnesPopraveny == null) return null;
        const p = H[dnesPopraveny]!;
        return { typ: 'ut', kdo: dnesPopraveny, role: m ? pickOf([...TOWN, ...OUT, ...MINIONS]) : p.role };
      }
      default:
        return null;
    }
  }

  /** Bluf zlého: co by řekl, kdyby byl na místě tohohle charakteru. */
  function bluf(h: P, role: Role): Info | null {
    if (!INFO_ROLE.has(role)) return null;
    const s = zaklad(h.r.lhani * K.lhani);
    const dobri = H.filter((x) => !x.zly && x.i !== h.i);
    const ostatni = H.filter((x) => x.i !== h.i);
    const dva = (pole: P[]) => sampleOf(pole, 2) as [P, P];
    switch (role) {
      case 'washerwoman': { const [a, b] = dva(dobri.length >= 2 ? dobri : ostatni); return { typ: 'wash', a: a.i, b: b.i, role: pickOf(TOWN) }; }
      case 'librarian': return coin(0.5) ? { typ: 'lib0' } : (() => { const [a, b] = dva(dobri.length >= 2 ? dobri : ostatni); return { typ: 'lib', a: a.i, b: b.i, role: pickOf(OUT) } as Info; })();
      case 'investigator': {
        // obvinění dvou dobrých z toho, že jeden z nich je přisluhovač
        const [a, b] = dva(dobri.length >= 2 ? dobri : ostatni);
        return { typ: 'inv', a: a.i, b: b.i, role: pickOf(MINIONS) };
      }
      case 'chef': {
        let k = 0;
        for (let i = 0; i < n; i++) if (H[i]!.zly && H[(i + 1) % n]!.zly) k++;
        return { typ: 'chef', k: coin(s) ? k : pickOf([0, 1, 2]) };
      }
      case 'empath': {
        const nb = sousedi(h.i);
        const pravda = nb.filter((j) => H[j]!.zly).length;
        // zkušený si „očistí“ zlé sousedy, nezkušený řekne cokoli
        const k = coin(s) ? Math.max(0, pravda - nb.filter((j) => H[j]!.zly).length) : pickOf([0, 1, 2]);
        return { typ: 'empath', k, nb };
      }
      case 'fortuneteller': {
        const [a, b] = dva(dobri.length >= 2 ? dobri : ostatni);
        return { typ: 'ft', a: a.i, b: b.i, ano: coin(s) ? false : coin(0.5) };
      }
      case 'undertaker': return null;
    }
    return null;
  }

  // ---------------------------------------------------------------- stopy do mysli

  const kdeStoji = (i: number) => (m: number) => (m >> i) & 1;
  function podminka(info: Info): ((h: Hyp) => boolean) | null {
    switch (info.typ) {
      case 'wash': case 'lib': { const { a, b } = info; return (h) => !(kdeStoji(a)(h.mask) && kdeStoji(b)(h.mask)); }
      case 'lib0': return null;
      case 'inv': { const { a, b } = info; return (h) => (kdeStoji(a)(h.mask) && h.dem !== a) || (kdeStoji(b)(h.mask) && h.dem !== b); }
      case 'chef': {
        const k = info.k;
        return (h) => { let c = 0; for (let i = 0; i < n; i++) if (kdeStoji(i)(h.mask) && kdeStoji((i + 1) % n)(h.mask)) c++; return c === k; };
      }
      case 'empath': { const { k, nb } = info; return (h) => nb.filter((j) => kdeStoji(j)(h.mask)).length === k; }
      case 'ft': { const { a, b, ano } = info; return (h) => ((h.dem === a || h.dem === b) || a === herring || b === herring) === ano; }
      case 'ut': case 'raven': {
        const zla = jeZlaRole(info.role);
        const kdo = info.kdo;
        return (h) => (kdeStoji(kdo)(h.mask)) === zla;
      }
    }
  }

  function zpracujVlastni(h: P, info: Info) {
    if (h.zly) return;
    const c = podminka(info);
    if (c && coin(zapamatuje(h))) h.mysl.mekke((hh) => (c(hh) ? 1 : 0.12), vyuziti(h));
  }

  // ---------------------------------------------------------------- rozprava

  function rozpravaDne() {
    const f = Math.min(1, K.rozprava);
    // ---- sdílení informací
    interface Tvrz { od: number; role: Role; info: Info[]; lez: boolean }
    const nova: Tvrz[] = [];
    for (const h of H) {
      if (!h.zivy) continue;
      const pSdil = zaklad(h.r.sdilnost * (0.7 + 0.3 * h.r.mluvnost) * f);
      if (!coin(pSdil)) continue;
      if (!h.zly) {
        h.tvrdiRoli = h.videny;
        const nove = h.info.slice(h.rekl);
        h.rekl = h.info.length;
        h.tvrdiInfo.push(...nove);
        nova.push({ od: h.i, role: h.videny, info: nove, lez: false });
        continue;
      }
      if (!coin(K.klam)) continue;
      // zlý bluffuje: jednu roli z bluffů, ověřitelné informace si vymýšlí
      if (!h.tvrdiRoli) h.tvrdiRoli = pickOf(bluffy);
      const b = bluf(h, h.tvrdiRoli);
      const info = b ? [b] : [];
      h.tvrdiInfo.push(...info);
      nova.push({ od: h.i, role: h.tvrdiRoli, info, lez: true });
    }
    // dvě tvrzení o téže roli: aspoň jeden z nich je zlý (nebo opilý)
    const poRolich = new Map<Role, number[]>();
    for (const h of H) if (h.tvrdiRoli) poRolich.set(h.tvrdiRoli, [...(poRolich.get(h.tvrdiRoli) ?? []), h.i]);

    for (const l of H) {
      if (l.zly) continue;
      if (!coin(l.r.pozornost ** 0.6 * (0.6 + 0.4 * l.r.pamet))) continue;
      for (const t of nova) {
        if (t.od === l.i) continue;
        const lhar = H[t.od]!.r.lhani * K.lhani;
        let flag: boolean;
        if (t.lez) flag = coin(zaklad(0.1 + 0.85 * zaklad(l.r.detekce * K.detekce) * (1 - zaklad(lhar)), 0.03, 0.9));
        else flag = coin(0.04 + 0.05 * l.r.sum);
        if (flag) l.soc[t.od] = l.soc[t.od]! + 1.2;
        for (const info of t.info) {
          const c = podminka(info);
          if (!c) continue;
          const od = t.od;
          l.mysl.mekke((hh) => (kdeStoji(od)(hh.mask) ? 0.35 : c(hh) ? 1 : 0.1), vyuziti(l) * K.duvera);
        }
      }
      // duplicitní role
      for (const [, ids] of poRolich) {
        if (ids.length < 2) continue;
        const [a, b] = ids as [number, number];
        if (a === l.i || b === l.i) continue;
        l.mysl.mekke((hh) => (kdeStoji(a)(hh.mask) || kdeStoji(b)(hh.mask) ? 1 : 0.4), vyuziti(l) * 0.7);
      }
    }

    // ---- sbližování názorů (stejný model jako ve Šichtě)
    const listeners = H.map((h) => h.i);
    const cile = zivi();
    const mluvi = new Map<number, number>();
    for (const i of listeners) {
      const h = H[i]!;
      if (!coin(h.r.mluvnost * f + 0.15)) continue;
      mluvi.set(i, (0.3 + 0.7 * h.r.presvedcivost) * (0.3 + 0.7 * h.r.mluvnost) * f);
    }
    const planCil = planZlych();
    const op = new Map<number, number[]>();
    for (const i of listeners) {
      const h = H[i]!;
      const mg = h.mysl.marg().zly;
      const v = new Array<number>(n).fill(-4);
      for (const t of cile) {
        if (t === i) continue;
        let l = logit(mg[t]!) + h.soc[t]! + h.zloba[t]! + h.sumDen[t]!;
        if (h.pritel === t) l -= h.r.loajalita * 1.8;
        v[t] = l;
      }
      if (h.zly) {
        const pub = verejnePodezreni();
        for (const t of cile) {
          if (t === i) continue;
          v[t] = H[t]!.zly ? -1.5 : logit(pub[t]!) + h.sumDen[t]! * 0.3;
        }
        if (planCil != null && coin(h.r.koordinace)) v[planCil] = v[planCil]! + 1.8;
      }
      if (coin(h.r.trollovani * 0.5)) v[pickOf(cile.filter((t) => t !== i))] = 3;
      op.set(i, v);
    }
    const kol = K.rozprava >= 2 ? 4 : K.rozprava >= 1.5 ? 3 : 2;
    for (let k = 0; k < kol; k++) {
      const dalsi = new Map<number, number[]>();
      for (const j of listeners) {
        const h = H[j]!;
        const mg = h.mysl.marg().zly;
        const vlastni = op.get(j)!;
        const num = new Array<number>(n).fill(0);
        let jm = 0;
        for (const [i, voice] of mluvi) {
          if (i === j) continue;
          const mluvci = H[i]!;
          let duvera = h.zly ? 1 : 1 - mg[i]!;
          if (h.pritel === i) duvera *= 1 + h.r.loajalita;
          const w = voice * duvera;
          if (w <= 0) continue;
          const e = op.get(i)!;
          const lhar = mluvci.zly ? zaklad(mluvci.r.lhani * K.lhani) : 1;
          const proh = mluvci.zly ? 0.8 * zaklad(h.r.detekce * K.detekce) * (1 - 0.6 * lhar) : 0;
          const obh = -2.5 * (0.4 + 0.6 * mluvci.r.presvedcivost) * (1 - proh) * (mluvci.zly ? 0.4 + 0.6 * lhar : 1);
          for (const t of cile) num[t]! += w * (t === i ? obh : e[t]!);
          jm += w;
        }
        if (jm <= 0) { dalsi.set(j, vlastni); continue; }
        const lam = h.zly ? 0.5 : zaklad((0.1 + 0.75 * h.r.sugestibilita) * K.presvedcovani, 0, 0.95);
        const nove = vlastni.slice();
        for (const t of cile) {
          if (t === j) continue;
          nove[t] = (1 - lam) * vlastni[t]! + lam * (num[t]! / jm);
          h.soc[t] = h.soc[t]! + (nove[t]! - vlastni[t]!);
        }
        dalsi.set(j, nove);
      }
      for (const [i, v] of dalsi) op.set(i, v);
    }
  }

  function verejnePodezreni(): number[] {
    const dobri = H.filter((h) => !h.zly && h.zivy);
    const out = new Array<number>(n).fill(0);
    if (!dobri.length) return out;
    for (const h of dobri) { const m = h.mysl.marg().zly; for (let j = 0; j < n; j++) out[j]! += m[j]! / dobri.length; }
    return out;
  }

  /** Koho se zlí snaží dostat na popravu: důvěryhodný dobrý, který tvrdí informační roli. */
  function planZlych(): number | null {
    const dobri = H.filter((h) => !h.zly && h.zivy);
    if (!dobri.length) return null;
    const pub = verejnePodezreni();
    let best = dobri[0]!;
    let bs = -Infinity;
    for (const h of dobri) {
      const sc = pub[h.i]! + (h.tvrdiRoli && INFO_ROLE.has(h.tvrdiRoli) ? 0.15 : 0) + R() * 0.05;
      if (sc > bs) { bs = sc; best = h; }
    }
    return best.i;
  }

  function podezreni(h: P, kruh: number[]): number[] {
    const mg = h.mysl.marg().zly;
    return kruh.map((j) => {
      let l = logit(mg[j]!) + h.soc[j]! + h.zloba[j]! + h.sumDen[j]!;
      if (h.pritel === j) l -= h.r.loajalita * 1.8;
      return sigmoid(l);
    });
  }

  // ---------------------------------------------------------------- smrt a konec

  let konec: { vitez: 'dobri' | 'zli'; duvod: string } | null = null;
  const zivych = () => H.filter((h) => h.zivy).length;
  function zkontrolujKonec() {
    if (konec) return;
    if (!H.some((h) => h.role === 'imp' && h.zivy)) { konec = { vitez: 'dobri', duvod: 'Démon je mrtvý.' }; return; }
    if (zivych() <= 2) konec = { vitez: 'zli', duvod: 'Zbyli dva živí.' };
  }
  let popravenoDobrych = 0, popravenoZlych = 0, nocnichVrazd = 0, nominaci = 0, dnuBezPopravy = 0;
  const popraveni = new Set<number>();
  const zabiti = new Set<number>();
  let minulaPoprava: number | null = null;

  function zemri(i: number, popravou: boolean, bezSW = false) {
    const h = H[i]!;
    if (!h.zivy) return;
    const pocetPred = zivych();
    h.zivy = false;
    if (popravou) popraveni.add(i); else zabiti.add(i);
    if (h.role === 'imp') {
      // Šarlatová žena přebírá démona, když zbývá aspoň pět živých (před smrtí)
      const sw = bezSW ? undefined : H.find((x) => x.zivy && x.role === 'scarletwoman');
      if (sw && pocetPred >= 5) {
        sw.role = 'imp'; sw.videny = 'imp';
        trace(`  Šarlatová žena (${sw.persona.jmeno}) se stává démonem`);
      }
    }
  }

  // ---------------------------------------------------------------- nominace a hlasy

  let blok: { kdo: number; hlasu: number } | null = null;

  function hlasovani(nominator: number, nominee: number) {
    const nom = H[nominee]!;
    nominaci++;
    nom.nominovan = true;
    H[nominator]!.nominoval = true;
    // Panna: poprvé nominovaná, nominátor je Townsfolk -> nominátor je popraven na místě
    if (nom.panna) {
      nom.panna = false;
      if (!nom.otraven && nom.role === 'virgin' && jeTown(H[nominator]!.role) && H[nominator]!.role !== 'drunk') {
        trace(`  Panna (${nom.persona.jmeno}) popravuje nominátora ${H[nominator]!.persona.jmeno}`);
        for (const x of H) {
          x.mysl.tvrde((h) => !kdeStoji(nominee)(h.mask) && !kdeStoji(nominator)(h.mask));
        }
        zemri(nominator, true);
        popravenoDobrych++;
        minulaPoprava = nominator;
        zkontrolujKonec();
        return 'konec_dne' as const;
      }
    }
    const zijiciPocet = zivych();
    const prah = Math.ceil(zijiciPocet / 2);
    let ano = 0;
    let ne = 0;
    const poradi: number[] = [];
    for (let k = 1; k <= n; k++) poradi.push((nominee + k) % n);
    for (const v of poradi) {
      const h = H[v]!;
      const mozeHlasovat = h.zivy || !h.duch;
      if (!mozeHlasovat) continue;
      if (!stiha(h)) { ne++; continue; }
      // Komorník hlasuje jen po pánovi
      let chce = chceAno(h, nominee, ano - ne, zijiciPocet, prah, ano);
      if (h.role === 'butler' && !h.otraven && h.pan != null) {
        const panAno = voteLog.get(h.pan);
        if (!panAno) chce = false;
      }
      if (!h.zivy && chce) h.duch = true;
      voteLog.set(v, chce);
      if (chce) ano++; else ne++;
    }
    voteLog.clear();
    if (ano >= prah) {
      if (!blok || ano > blok.hlasu) blok = { kdo: nominee, hlasu: ano };
      else if (ano === blok.hlasu) blok = null;
    }
    return 'dal' as const;
  }
  const voteLog = new Map<number, boolean>();

  function chceAno(h: P, nominee: number, rozdil: number, zijici: number, prah: number, anoDosud: number): boolean {
    if (coin(h.r.trollovani * 0.3)) return coin(0.5);
    if (h.zly) {
      const cil = H[nominee]!;
      if (cil.zly) {
        // obětovat přisluhovače, když je stejně ztracený a týmu to prospěje
        const exp = verejnePodezreni()[nominee]!;
        const obet = cil.role !== 'imp' && coin(h.r.obetovani * 0.5 * zaklad((exp - 0.45) * 3));
        return obet;
      }
      return coin(0.8 + 0.15 * h.r.odvaha);
    }
    if (!h.zivy) {
      // duch: jediný hlas, neutratí ho jen tak
      const p = podezreni(h, [nominee])[0]!;
      const blizko = anoDosud >= prah - 1;
      return p > 0.5 && (blizko || coin(h.r.netrpelivost * 0.4 + 0.2));
    }
    const p = podezreni(h, [nominee])[0]!;
    const dav = (rozdil / Math.max(1, zijici)) * h.r.sugestibilita * 2;
    const peff = sigmoid(logit(p) + dav);
    if (h.pritel === nominee && p < 0.85) return false;
    const thr = 0.5 - 0.2 * h.r.odvaha;
    if (peff < thr && coin(0.4 * h.r.zdrzenlivost)) return false;
    return peff >= thr;
  }

  function den(dnes: number) {
    blok = null;
    for (const h of H) { h.nominoval = false; h.nominovan = false; }
    // Zabiják: jednou za hru střelí podle podezření
    for (const h of H) {
      if (!h.zivy || h.role !== 'slayer' || !h.zabijak || !stiha(h)) continue;
      const kruh = zivi().filter((j) => j !== h.i);
      const p = podezreni(h, kruh);
      let b = 0;
      for (let k = 1; k < kruh.length; k++) if (p[k]! > p[b]!) b = k;
      if (p[b]! >= 0.55 - 0.25 * h.r.odvaha && coin(0.6 + 0.3 * h.r.odvaha)) {
        h.zabijak = false;
        const cil = H[kruh[b]!]!;
        if (!h.otraven && h.role === 'slayer' && jeviSeDemon(cil)) {
          trace(`  Zabiják (${h.persona.jmeno}) zabíjí démona ${cil.persona.jmeno}`);
          zemri(cil.i, false);
          zkontrolujKonec();
          if (konec) return;
        } else {
          for (const x of H) x.mysl.mekke((hh) => (hh.dem === cil.i ? 0.2 : 1), 1);
        }
      }
    }
    // nominace
    const maxNom = Math.max(2, Math.ceil(zivych() / 2));
    let pocet = 0;
    let beziVlna = true;
    let vlny = 0;
    while (beziVlna && pocet < maxNom && vlny++ < 4) {
      beziVlna = false;
      const poradi = zivi().sort(() => R() - 0.5);
      for (const i of poradi) {
        const h = H[i]!;
        if (!h.zivy || h.nominoval || pocet >= maxNom || !stiha(h)) continue;
        const kruh = zivi().filter((j) => j !== i && !H[j]!.nominovan);
        if (!kruh.length) continue;
        let cil: number | null = null;
        if (coin(h.r.trollovani * 0.3)) cil = pickOf(kruh);
        else if (h.zly) {
          const dobri = kruh.filter((j) => !H[j]!.zly);
          if (!dobri.length) continue;
          const plan = planZlych();
          if (plan != null && dobri.includes(plan) && coin(h.r.koordinace)) cil = plan;
          else { const pub = verejnePodezreni(); cil = dobri.reduce((a, b) => (pub[a]! >= pub[b]! ? a : b)); }
          if (!coin(0.45 + 0.4 * h.r.odvaha)) cil = null;
        } else {
          const p = podezreni(h, kruh);
          let b = 0;
          for (let k = 1; k < kruh.length; k++) if (p[k]! > p[b]!) b = k;
          const prah = 0.62 - 0.32 * h.r.odvaha;
          if (p[b]! >= prah && !(h.pritel === kruh[b] && p[b]! < 0.85)) {
            cil = kruh[b]!;
            // nominovat má smysl jen když dotyčný jde výš než ten, kdo už na bloku stojí
            if (blok) { const pb = podezreni(h, [blok.kdo])[0]!; if (p[b]! <= pb) cil = null; }
          }
        }
        if (cil == null) continue;
        pocet++;
        beziVlna = true;
        const v = hlasovani(i, cil);
        if (v === 'konec_dne') return;
        if (konec) return;
      }
    }
    // poprava
    if (blok) {
      const kdo = blok.kdo;
      const h = H[kdo]!;
      trace(`  poprava: ${h.persona.jmeno} (${h.role})`);
      const zivychPred = zivych();
      zemri(kdo, true);
      minulaPoprava = kdo;
      if (h.zly) popravenoZlych++; else popravenoDobrych++;
      if (h.role === 'saint' && !h.otraven) { konec = { vitez: 'zli', duvod: 'Popraven Svatý.' }; return; }
      zkontrolujKonec();
      if (konec) return;
      // hra pokračuje, takže popravený nebyl démon (nebo to byla Šarlatová žena)
      for (const x of H) x.mysl.mekke((hh) => (hh.dem === kdo ? 0.25 : 1), 1);
      void zivychPred;
    } else {
      dnuBezPopravy++;
      minulaPoprava = null;
      if (zivych() === 3) {
        const mayor = H.find((x) => x.zivy && x.role === 'mayor' && !x.otraven);
        if (mayor) konec = { vitez: 'dobri', duvod: 'Starosta, tři živí a žádná poprava.' };
      }
    }
    void dnes;
  }

  // ---------------------------------------------------------------- noc

  function noc(nocCislo: number) {
    for (const h of H) h.otraven = false;
    // Travič
    const trav = H.find((h) => h.role === 'poisoner' && h.zivy);
    if (trav) {
      const kruh = zivi().filter((j) => j !== trav.i && !H[j]!.zly);
      if (kruh.length) {
        const maInfo = kruh.filter((j) => H[j]!.tvrdiRoli && INFO_ROLE.has(H[j]!.tvrdiRoli!));
        const cil = maInfo.length && coin(0.4 + 0.5 * trav.r.pravidla) ? pickOf(maInfo) : pickOf(kruh);
        H[cil]!.otraven = true;
      }
    }
    // Mnich
    let chraneny = -1;
    const mnich = H.find((h) => h.role === 'monk' && h.zivy);
    if (mnich && nocCislo > 1 && !malf(mnich)) {
      const kruh = zivi().filter((j) => j !== mnich.i);
      const mg = mnich.mysl.marg().zly;
      const duveryhodni = kruh.sort((a, b) => mg[a]! - mg[b]!);
      chraneny = coin(0.3 + 0.5 * mnich.r.analytika) ? duveryhodni[0]! : pickOf(kruh);
    }
    // Komorník vybere pána
    const komorník = H.find((h) => h.role === 'butler' && h.zivy);
    if (komorník) komorník.pan = pickOf(zivi().filter((j) => j !== komorník.i));
    // Imp
    let obet: number | null = null;
    const imp = demon();
    if (imp && nocCislo > 1) {
      const dobri = zivi().filter((j) => !H[j]!.zly);
      const pub = verejnePodezreni();
      const pHrozba = 0.1 + 0.7 * (0.5 * imp.r.pravidla + 0.5 * imp.r.lhani);
      let cil: number;
      const miniony = zivi().filter((j) => H[j]!.zly && H[j]!.role !== 'imp');
      // předání: imp pod tlakem se zabije a démonem se stane přisluhovač
      if (miniony.length && pub[imp.i]! > 0.6 && coin(imp.r.pravidla * 0.8)) {
        const novy = H[pickOf(miniony)]!;
        trace(`  Imp se zabíjí, démonem se stává ${novy.persona.jmeno}`);
        const staryI = imp.i;
        novy.role = 'imp'; novy.videny = 'imp';
        zemri(staryI, false, true);
        obet = null;
        nocnichVrazd++;
      } else {
        if (coin(pHrozba)) {
          // nejnebezpečnější: důvěryhodný, který tvrdí informační roli
          const sk = dobri.map((j) => (H[j]!.tvrdiRoli && INFO_ROLE.has(H[j]!.tvrdiRoli!) ? 1 : 0) + (1 - pub[j]!) * 0.5 + R() * 0.2);
          cil = dobri[sk.indexOf(Math.max(...sk))]!;
        } else cil = pickOf(dobri.length ? dobri : zivi().filter((j) => j !== imp.i));
        if (cil === undefined) return;
        // vypravěč: Starosta se může obětovat jinému
        const c = H[cil]!;
        if (c.role === 'mayor' && !c.otraven && coin(0.5)) { const jini = zivi().filter((j) => j !== imp.i && j !== cil); if (jini.length) cil = pickOf(jini); }
        const cc = H[cil]!;
        if (cc.role === 'soldier' && !cc.otraven) { /* voják přežije */ }
        else if (cil === chraneny) { /* mnich ochránil */ }
        else {
          obet = cil;
          const ravenOd = cc.role === 'ravenkeeper' && !cc.otraven && !malf(cc) ? cc : null;
          zemri(cil, false);
          nocnichVrazd++;
          // smrt v noci je veřejná: oběť není démon
          for (const x of H) x.mysl.mekke((hh) => (hh.dem === cil ? 0.3 : 1), 1);
          if (ravenOd) {
            const kruh = zivi().filter((j) => j !== cil);
            const mg = ravenOd.mysl.marg().zly;
            const kdo = kruh.sort((a, b) => mg[b]! - mg[a]!)[0];
            if (kdo !== undefined) {
              const inf: Info = { typ: 'raven', kdo, role: H[kdo]!.role };
              ravenOd.info.push(inf);
              zpracujVlastni(ravenOd, inf);
            }
          }
        }
      }
      void obet;
    }
    zkontrolujKonec();
    if (konec) return;
    // informace
    for (const h of H) {
      if (!h.zivy) continue;
      const role = h.videny;
      if (!INFO_ROLE.has(role)) continue;
      const jenPrvni = role === 'washerwoman' || role === 'librarian' || role === 'investigator' || role === 'chef';
      if (jenPrvni && nocCislo > 1) continue;
      if (role === 'undertaker' && nocCislo === 1) continue;
      const inf = infoPro(h, role, role === 'undertaker' ? minulaPoprava : null);
      if (!inf) continue;
      h.info.push(inf);
      zpracujVlastni(h, inf);
    }
  }

  // ---------------------------------------------------------------- partie

  // noc 1: zlí se poznají, démon dostane bluffy
  for (const h of H) if (h.zly) for (const o of H) if (o.zly && o.i !== h.i) { /* vzájemné poznání */ }
  noc(1);
  let dnes = 0;
  let sekundy = 0;
  const zakladDenMin = n <= 8 ? 8 : 12;
  while (!konec && dnes < 25) {
    dnes++;
    for (const h of H) for (let j = 0; j < n; j++) { h.soc[j]! *= 0.5; h.sumDen[j] = gauss() * h.r.sum * K.sum * 0.6; }
    rozpravaDne();
    sekundy += zakladDenMin * 60 * K.rozprava;
    const nomPred = nominaci;
    den(dnes);
    sekundy += (nominaci - nomPred) * 100 + 60;
    if (konec) break;
    noc(dnes + 1);
    sekundy += (180 + 25 * zivych());
    zkontrolujKonec();
  }
  if (!konec) konec = { vitez: 'zli', duvod: 'Nedohrálo se.' };
  const k: { vitez: 'dobri' | 'zli'; duvod: string } = konec;
  return {
    n, zlych: zlychCelkem, vitez: k.vitez, duvod: k.duvod, dni: dnes, sekundy,
    popravenoDobrych, popravenoZlych, nocnichVrazd, dnuBezPopravy, nominaci,
    hraci: H.map((h) => ({
      persona: h.persona.klic, role: h.role, zly: h.zly, vyhral: (k.vitez === 'zli') === h.zly,
      zivyNaKonci: h.zivy, popraven: popraveni.has(h.i), zabit: zabiti.has(h.i),
    })),
    rysy: H.map((h) => h.r),
  };
}
