/**
 * Jedna partie Šichty odehraná skutečným reducerem (`src/game/machine.ts`)
 * a skutečným pohledem (`src/game/pohled.ts`), s lidskými hráči místo bota.
 *
 * Co z hry je skutečné: rozdání rolí, losování part, výsledek šichty, šeptanda
 * (věty rozdává `septanda.ts`), nominace, kandidáti, kvórum rady, hlasy stínů,
 * odměny, vražda, imunita, tma, limit šicht, konec. Nic z toho tu není
 * zjednodušené oproti aplikaci.
 *
 * Co je model: rozhodování hráčů. Každý hráč má vlastní mysl (`mysl.ts`),
 * kterou krmí tím, co by viděl na telefonu, a rozhoduje podle rysů persony.
 * Rozprava u stolu je model druhého řádu (kdo obviňuje koho, komu se věří,
 * jak se pozná lež). Všechny jeho konstanty jsou v `Parametry`, aby šly
 * v citlivostní analýze měnit.
 */

import { dostupneOdmeny, prazdnyStav, reducer } from '../../src/game/machine';
import { pohledPro } from '../../src/game/pohled';
import { delkaFaze } from '../../src/game/rules';
import { platiTvrzeni, vetaZTvrzeni, type KontextSeptandy } from '../../src/game/septanda';
import { rng } from '../../src/game/random';
import type { Akce, Nastaveni, Odmena, Role, Stav, Tvrzeni } from '../../src/game/types';
import { Mysl, logit, podminkaTvrzeni, pop, sigmoid, verohodnostSichty } from './mysl';
import type { Persona, Rysy, Uprava } from './persony';

// ---------------------------------------------------------------- parametry modelu

/**
 * Konstanty modelu, které nejsou rysem žádného hráče. Výchozí 1 je moje nejlepší
 * odhad. Citlivostní analýza je posouvá nahoru a dolů, aby bylo vidět, které
 * výsledky na nich visí.
 */
export interface Parametry {
  /** Síla čtení lidí: násobí šanci, že poznáš lež. 0 = nikdo lež nepozná. */
  detekce: number;
  /** Síla lhaní: násobí, jak dobře sabotéři zakrývají lež. */
  lhani: number;
  /** Síla přesvědčování v rozpravě. 0 = rozprava nic nemění. */
  presvedcovani: number;
  /** Násobek šumu intuice u všech. */
  sum: number;
  /** Důvěřivost k tvrzením ostatních: násobí sílu, s jakou se věta ze šeptandy bere jako stopa. */
  duvera: number;
  /** Jak často sabotéři lžou, když mluví. 0 = mlčí, 1 = podle persony. */
  klam: number;
  /** Délka rozpravy jako násobek výchozí. Kratší znamená míň vět a míň mluvčích, delší víc kol sbližování. */
  rozprava: number;
  /** Jak chytře sabotéři hrají (poslední kolo bez sabotáže, obětování partnera, imunita pro odhaleného). */
  chytrost: number;
}
export const VYCHOZI: Parametry = { detekce: 1, lhani: 1, presvedcovani: 1, sum: 1, duvera: 1, klam: 1, rozprava: 1, chytrost: 1 };

export interface Zadani {
  osoby: Persona[];
  /** Dvojice sedadel, které jsou kamarádi nebo partneři. */
  pritele?: [number, number][];
  uprava?: Uprava;
  nastaveni?: Partial<Nastaveni>;
  seed: number;
  knob?: Partial<Parametry>;
  /** Vynucené sabotéry (indexy sedadel, první je předák). Jinak je losuje hra. */
  saboteri?: number[];
  /** Jiná sestava, než předepisuje `rules.ts`. Jen pro měření, ve hře to není. */
  sestava?: { saboteri?: number; limit?: number };
  /**
   * Kalibrace proti starému simulátoru: sabotéři nemluví a nelžou, kazí podle
   * politiky „vyvážená“, vraždí nejdůvěryhodnějšího pracanta a nepřeskakují
   * poslední kolo. Jen pro srovnání, ne pro vlastní výsledky.
   */
  saboteriMlci?: boolean;
  /** Rysy po úpravě z předchozích partií večera. Přebíjí persony. */
  rysy?: Rysy[];
  trace?: (zprava: string) => void;
  /** Ladící sonda: u každého pracanta těsně před nominací, jestli jeho nejpodezřelejší je sabotér. */
  sonda?: (kolo: number, raw: boolean, plny: boolean) => void;
}

export interface KoloStat {
  cislo: number;
  padla: boolean;
  sabotazi: number;
  partaSabotaru: number;
  kandidatu: number;
  hlasu: number;
  vyhostenaRole: Role | null;
  odmena: Odmena | null;
  obet: boolean;
  tma: boolean;
  imunita: boolean;
}

export interface HracStat {
  persona: string;
  role: Role;
  vyhral: boolean;
  zivyNaKonci: boolean;
  vyhosten: boolean;
  zavrazden: boolean;
  hlasu: number;
  hlasuNaSaboteryPracantem: number;
  nominaci: number;
  nominaciNaSabotery: number;
  kazil: number;
}

export interface VysledekPartie {
  n: number;
  saboteru: number;
  limit: number;
  vitez: 'pracanti' | 'saboteri' | null;
  duvod: string;
  /** Poslední odehrané kolo. */
  kol: number;
  kola: KoloStat[];
  sekundy: number;
  anomalie: string | null;
  hraci: HracStat[];
  rysy: Rysy[];
}

// ---------------------------------------------------------------- pomocné

const zaklad = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));

export function upravRysy(r: Rysy, u?: Uprava): Rysy {
  if (!u) return { ...r };
  const o = { ...r };
  for (const k of Object.keys(u) as (keyof Rysy)[]) {
    const v = o[k] * (u[k] ?? 1);
    o[k] = k === 'sum' ? zaklad(v, 0, 2.5) : k === 'tempo' ? zaklad(v, 0.4, 3) : zaklad(v);
  }
  return o;
}

interface H {
  i: number;
  persona: Persona;
  r: Rysy;
  role: Role;
  mysl: Mysl;
  /** Vliv rozpravy na podezření, v logitech. Mezi koly slábne na polovinu. */
  soc: number[];
  /** Co mu kdo udělal. Přenáší se do dalších kol. */
  zloba: number[];
  /** Šum intuice pro tohle kolo. */
  sumKolo: number[];
  pritel: number | null;
  /** Věta ze šeptandy jako data, pokud nějakou dostal. */
  vlastni: Tvrzeni | null;
}

interface Tvrz {
  od: number;
  t: Tvrzeni;
  text: string;
  pravdive: boolean;
  lez: boolean;
}

const idDo = (i: number) => `h${i}`;
const doIdx = (id: string) => Number(id.slice(1));
const bity = (a: number[]) => a.reduce((x, i) => x | (1 << i), 0);

// ---------------------------------------------------------------- partie

export function hrajPartii(z: Zadani): VysledekPartie {
  const K: Parametry = { ...VYCHOZI, ...z.knob };
  const n = z.osoby.length;
  const R = rng(((z.seed * 2654435761) ^ 0x9e3779b9) >>> 0);
  const coin = (p: number) => R() < p;
  const gauss = () => Math.sqrt(-2 * Math.log(Math.max(R(), 1e-12))) * Math.cos(2 * Math.PI * R());
  const pickOf = <T,>(a: T[]): T => a[Math.floor(R() * a.length)]!;
  const trace = z.trace ?? (() => {});

  // ---- stav hry
  let s: Stav = prazdnyStav();
  s = { ...s, nastaveni: { ...s.nastaveni, ...z.nastaveni } };
  for (let i = 0; i < n; i++) s = reducer(s, { typ: 'PRIDAT_HRACE', id: idDo(i), jmeno: `H${i + 1}` }, z.seed);
  s = reducer(s, { typ: 'ZACIT', seed: z.seed }, z.seed);
  if (z.sestava?.saboteri != null && !z.saboteri) {
    // jiný počet sabotérů, než dává rules.ts: vylosujeme znovu, stejně jako ve hře
    const poradi = Array.from({ length: n }, (_, i) => i).sort(() => R() - 0.5);
    z = { ...z, saboteri: poradi.slice(0, z.sestava.saboteri) };
  }
  if (z.saboteri) {
    const role: Record<string, Role> = {};
    for (let i = 0; i < n; i++) role[idDo(i)] = z.saboteri.includes(i) ? 'saboter' : 'pracant';
    s = { ...s, role, predak: idDo(z.saboteri[0]!), pocetSaboteru: z.saboteri.length };
  }
  if (z.sestava?.limit != null) s = { ...s, limitSicht: z.sestava.limit };
  const akce = (a: Akce) => { s = reducer(s, a, z.seed); };
  const jm = (id: string) => s.hraci[doIdx(id)]!.jmeno;
  const S = s.pocetSaboteru;

  // ---- hráči
  const pritel = new Map<number, number>();
  for (const [a, b] of z.pritele ?? []) { pritel.set(a, b); pritel.set(b, a); }
  const H: H[] = z.osoby.map((p, i) => {
    const role = s.role[idDo(i)]!;
    const r = z.rysy?.[i] ?? upravRysy(p.rysy, z.uprava);
    return {
      i, persona: p, r, role,
      mysl: new Mysl(n, S, role === 'pracant' ? i : null),
      soc: new Array(n).fill(0),
      zloba: new Array(n).fill(0),
      sumKolo: new Array(n).fill(0),
      pritel: pritel.get(i) ?? null,
      vlastni: null,
    };
  });
  const rolePodleSedadla = H.map((h) => h.role);

  // ---- veřejná paměť stolu
  const verejne = new Map<number, Role>();
  const sichty: { kolo: number; parta: number[]; c: number }[] = [];
  const rady = new Map<number, { kdo: number; komu: number }[] | null>();
  const tlakNaSabotery = new Array<number>(n).fill(0);   // kolikrát kdo veřejně obvinil sabotéra
  const hlasyNaSabotery = new Array<number>(n).fill(0);  // kolikrát kdo hlasoval proti sabotérovi

  // ---- statistiky
  const kolaStat: KoloStat[] = [];
  const stat: HracStat[] = H.map((h) => ({
    persona: h.persona.klic, role: h.role, vyhral: false, zivyNaKonci: false, vyhosten: false, zavrazden: false,
    hlasu: 0, hlasuNaSaboteryPracantem: 0, nominaci: 0, nominaciNaSabotery: 0, kazil: 0,
  }));
  let sekundy = 25;
  let anomalie: string | null = null;

  // ---------------------------------------------------------------- pomocné dotazy

  const zivi = () => s.hraci.flatMap((h, i) => (h.zivy ? [i] : []));
  const stiny = () => s.hraci.flatMap((h, i) => (!h.zivy ? [i] : []));
  const pracantiZivi = () => zivi().filter((i) => H[i]!.role === 'pracant');
  const saboteriZivi = () => zivi().filter((i) => H[i]!.role === 'saboter');
  const jeZivy = (i: number) => s.hraci[i]!.zivy;

  /**
   * Kolik z důkazu hráč využije. I nováček z padlé šichty vyčte, že v ní někdo je,
   * takže exponent nezačíná na nule.
   */
  const vyuziti = (h: H) => 0.3 + 0.7 * h.r.analytika;
  /** Historii šicht a rad ukazuje aplikace, takže se zapomíná míň, než by odpovídalo paměti. */
  const zapamatuje = (h: H) => 0.65 + 0.35 * h.r.pamet;

  /** Tah stihne udělat. Pozornost je rys, v praxi to ale není všechno nebo nic. */
  const stiha = (h: H) => coin(h.r.pozornost ** 0.6);
  const reakce = (h: H, stredni: number) => stredni * h.r.tempo * Math.exp(0.45 * gauss());

  /** Co si hráč h myslí o ostatních, v pravděpodobnostech. Šum a vliv rozpravy jsou započítané. */
  function podezreni(h: H, kruh: number[]): number[] {
    const m = h.mysl.marginaly();
    return kruh.map((j) => {
      let l = logit(m[j]!) + h.soc[j]! + h.zloba[j]! + h.sumKolo[j]!;
      if (h.pritel === j) l -= h.r.loajalita * 1.8;
      return sigmoid(l);
    });
  }
  const argmax = (kruh: number[], p: number[]) => {
    let b = 0;
    for (let k = 1; k < kruh.length; k++) if (p[k]! > p[b]!) b = k;
    return b;
  };

  /** Průměrné podezření pracantů na každého hráče. Takhle stůl vidí sabotéra. */
  function verejnePodezreni(): number[] {
    const prac = pracantiZivi();
    const out = new Array<number>(n).fill(0);
    if (!prac.length) return out;
    for (const i of prac) {
      const m = H[i]!.mysl.marginaly();
      for (let j = 0; j < n; j++) out[j]! += m[j]! / prac.length;
    }
    return out;
  }

  // ---------------------------------------------------------------- šichta

  function kazi(h: H, parta: number[]): boolean {
    const sabsVParte = parta.filter((i) => H[i]!.role === 'saboter');
    const k = sabsVParte.length;
    // V posledním kole nemá sabotáž smysl: odměna přijde až po poslední radě a nic už nezmění.
    // Prozradí jen, že mezi nimi někdo je. Ví to jen ten, kdo hře rozumí.
    if (!z.saboteriMlci && s.kolo >= s.limitSicht && coin(h.r.pravidla ** 1.5 * zaklad(K.chytrost))) return false;
    if (z.saboteriMlci) return coin(k <= 1 ? 0.85 : 1 / k);
    const solo = 0.45 + 0.5 * h.r.odvaha;
    if (k === 1) return coin(solo);
    // Dohodnutá konvence: kazí ten s nejnižším sedadlem. Funguje jen, když ji znají oba.
    if (coin(h.r.koordinace)) return Math.min(...sabsVParte) === h.i ? coin(solo) : false;
    return coin(Math.min(1, (solo * 1.1) / k));
  }

  function ingestSichty(parta: number[], c: number) {
    const pb = bity(parta);
    for (const h of H) {
      if (!coin(zapamatuje(h))) continue;
      const sila = vyuziti(h) * (c === 0 ? 0.6 : 1);
      h.mysl.mekke((m) => verohodnostSichty(pop(m & pb), c), sila);
    }
  }

  // ---------------------------------------------------------------- šeptanda a rozprava

  const kontextSeptandy = (): KontextSeptandy => ({
    role: s.role,
    jmeno: jm,
    predak: s.predak,
    zivi: zivi().map(idDo),
    pocetHracu: n,
    historie: s.historie,
    smeny: s.aktualni?.smeny ?? [],
    kolo: s.kolo,
    proSabotery: s.nastaveni.septandaProSabotery,
  });

  /** Odporuje tvrzení tomu, co už je veřejně známé z odhalených rolí? Takovou lež pozná každý, kdo se dívá. */
  function odporujeVerejnemu(t: Tvrzeni): boolean {
    const r = (i: number) => verejne.get(i);
    switch (t.typ) {
      case 'cisty': return r(doIdx(t.kdo)) === 'saboter';
      case 'nejsou_vsichni': return t.kdo.every((id) => r(doIdx(id)) === 'saboter');
      case 'aspon_jeden': return t.kdo.every((id) => r(doIdx(id)) === 'pracant');
      default: return false;
    }
  }

  /** Hrozba pro sabotéry podle toho, co je na stole vidět: kdo je veřejně obviňoval. */
  const hrozba = (j: number) => hlasyNaSabotery[j]! + 0.5 * tlakNaSabotery[j]!;

  function vymyslet(h: H): Tvrzeni | null {
    const prac = pracantiZivi().filter((i) => i !== h.i);
    const partneri = saboteriZivi().filter((i) => i !== h.i);
    if (!prac.length) return null;
    const lhani = zaklad(h.r.lhani * K.lhani);
    const wPravda = 0.1 + 0.6 * lhani;
    const wUtok = 0.35;
    const wObrana = (1 - lhani) * 0.5 + (partneri.length ? 0 : -1);
    const wSum = wPravda + wUtok + Math.max(0, wObrana);
    let los = R() * wSum;
    const sam = idDo(h.i);
    const vyber = (pole: number[], k: number) => {
      const c = pole.slice();
      const o: number[] = [];
      while (o.length < k && c.length) o.push(c.splice(Math.floor(R() * c.length), 1)[0]!);
      return o;
    };
    if ((los -= wPravda) <= 0) {
      // pravdivá a neškodná: aspoň jeden z dvojice (já, pracant) je pracant
      return { typ: 'nejsou_vsichni', kdo: [sam, idDo(pickOf(prac))] };
    }
    if ((los -= wUtok) <= 0) {
      // nepravdivá a útočná: aspoň jeden ze tří pracantů je sabotér
      const cile = vyber(prac, 3);
      if (cile.length < 3) return null;
      return { typ: 'aspon_jeden', kdo: cile.map(idDo) };
    }
    // nepravdivá a obranná: čistý je partner (nebo já)
    return partneri.length && coin(0.6)
      ? { typ: 'cisty', kdo: idDo(pickOf(partneri)) }
      : { typ: 'nejsou_vsichni', kdo: [sam, idDo(pickOf(partneri.length ? partneri : prac))] };
  }

  /** Cíl, na který se sabotéři shodnou, když se domlouvají beze slov. */
  function planSaboteru(): number | null {
    const prac = pracantiZivi();
    if (!prac.length) return null;
    const pub = verejnePodezreni();
    let best = prac[0]!;
    let bs = -Infinity;
    for (const j of prac) {
      const sc = pub[j]! + 0.5 * hrozba(j) * 0.15;
      if (sc > bs) { bs = sc; best = j; }
    }
    return best;
  }

  function rozprava() {
    const zivych = zivi().length;
    const cap = delkaFaze('rozprava', zivych);

    // kdo chce dál
    for (const i of zivi()) {
      const h = H[i]!;
      if (coin(h.r.netrpelivost * 0.8 * (s.kolo > 1 ? 1 : 0.6))) akce({ typ: 'CHCI_DAL', id: idDo(i) });
    }
    const skratilo = s.faze !== 'rozprava';
    const f = (skratilo ? 0.5 : 1) * Math.min(1, K.rozprava);
    sekundy += (skratilo ? 0.5 * cap + 5 : cap) * K.rozprava;

    // ---- 1) šeptanda nahlas
    const ctx = kontextSeptandy();
    const tvrzeni: Tvrz[] = [];
    const poradi = zivi().sort(() => R() - 0.5);
    const faleseSabotera = new Map<number, Tvrz>();
    for (const i of poradi) {
      const h = H[i]!;
      const pSdil = zaklad(h.r.sdilnost * (0.7 + 0.3 * h.r.mluvnost) * (skratilo ? 0.7 : 1));
      if (h.role === 'pracant') {
        if (h.vlastni && coin(pSdil)) {
          tvrzeni.push({ od: i, t: h.vlastni, text: vetaZTvrzeni(h.vlastni, jm), pravdive: true, lez: false });
        } else if (coin(h.r.trollovani * 0.4)) {
          // pro legraci: tvrdí něco, co si vymyslel
          const cil = pickOf(zivi().filter((j) => j !== i));
          const t: Tvrzeni = { typ: 'cisty', kdo: idDo(cil) };
          const pravda = platiTvrzeni(t, ctx);
          tvrzeni.push({ od: i, t, text: vetaZTvrzeni(t, jm), pravdive: pravda, lez: !pravda });
        }
        continue;
      }
      // sabotér
      if (z.saboteriMlci) continue;
      if (!coin(pSdil)) continue;
      if (!coin(K.klam)) continue;
      const partnerLez = [...faleseSabotera.values()][0];
      if (partnerLez && coin(h.r.koordinace * 0.7 * K.chytrost)) {
        // zopakuje partnerovu větu a tím jí dodá váhu
        tvrzeni.push({ od: i, t: partnerLez.t, text: partnerLez.text, pravdive: partnerLez.pravdive, lez: partnerLez.lez });
        continue;
      }
      if (h.vlastni && coin(0.3 + 0.3 * h.r.lhani * K.lhani) && !jmenujePartnera(h.vlastni, h)) {
        tvrzeni.push({ od: i, t: h.vlastni, text: vetaZTvrzeni(h.vlastni, jm), pravdive: true, lez: false });
        continue;
      }
      let t: Tvrzeni | null = null;
      for (let pokus = 0; pokus < 4; pokus++) {
        t = vymyslet(h);
        if (!t) break;
        if (!odporujeVerejnemu(t)) break;
        if (!coin(h.r.lhani * 0.9 * K.lhani)) break;   // hloupý lhář to nechá být
      }
      if (!t) continue;
      const pravda = platiTvrzeni(t, ctx);
      const tv: Tvrz = { od: i, t, text: vetaZTvrzeni(t, jm), pravdive: pravda, lez: !pravda };
      tvrzeni.push(tv);
      if (!pravda) faleseSabotera.set(i, tv);
    }

    // ---- 2) kdo čemu věří
    const poct = new Map<string, number>();
    for (const c of tvrzeni) poct.set(c.text, (poct.get(c.text) ?? 0) + 1);
    const ruznych = poct.size;
    const hlasyKola = (kolo: number) => rady.get(kolo) ?? null;
    const partaKola = (kolo: number) => sichty.find((x) => x.kolo === kolo)?.parta ?? null;
    const listeners = [...zivi(), ...stiny()];
    for (const j of listeners) {
      const h = H[j]!;
      if (h.role === 'saboter') continue;   // ví, jak věci jsou
      for (const c of tvrzeni) {
        if (c.od === j) continue;
        if (!coin(h.r.pozornost ** 0.6 * (0.6 + 0.4 * h.r.pamet))) continue;
        let flag: boolean;
        if (odporujeVerejnemu(c.t)) flag = true;
        else if (c.lez) {
          const lhar = zaklad(H[c.od]!.r.lhani * K.lhani);
          flag = coin(zaklad(0.1 + 0.85 * zaklad(h.r.detekce * K.detekce) * (1 - lhar), 0.03, 0.9));
        } else flag = coin(0.04 + 0.05 * h.r.sum);
        if (ruznych > 3 && poct.get(c.text) === 1 && coin(h.r.pravidla * 0.4)) flag = flag || coin(0.5);
        // čtení lidí: pocit, že mu to nesedí, zvedne podezření na mluvčího
        if (flag) h.soc[c.od] = h.soc[c.od]! + 1.2;
        // Pracant nelže. Kdo tvrdí něco, co neladí s tím, co vím, je buď sabotér, nebo se plete.
        // Sabotér řekne cokoli, takže u něj věrohodnost věty není nulová, ale menší než u pracanta.
        const cond = podminkaTvrzeni(c.t, doIdx, hlasyKola, partaKola);
        const od = c.od;
        // Věta, kterou řekl jediný člověk, váží míň než ta, za kterou se postavilo víc lidí.
        const podpora = (poct.get(c.text) ?? 1) >= 2 ? 1 : 0.45;
        if (cond) h.mysl.mekke((mm) => (((mm >> od) & 1) ? 0.35 : cond(mm) ? 1 : 0.03), vyuziti(h) * K.duvera * podpora);
      }
    }

    // ---- 3) sbližování názorů
    //
    // Každý má vlastní názor (z důkazů, se šumem). Mluví ti, kdo mají hlas, a každý
    // se přibližuje k váženému průměru toho, co zaznělo. Váha je hlasitost mluvčího
    // krát důvěra posluchače v něj, a ochota se přiblížit je sugestibilita. Dvě
    // kola, ať se stihne ozvat i odpověď. Tohle je to, co z osmi nezávislých tipů
    // dělá u stolu jednu nebo dvě hlavní verze.
    const plan = planSaboteru();
    const cile = zivi();
    const mluvi = new Map<number, number>();
    for (const i of listeners) {
      const h = H[i]!;
      if (!coin(h.r.mluvnost * f + 0.15)) continue;
      mluvi.set(i, (0.3 + 0.7 * h.r.presvedcivost) * (0.3 + 0.7 * h.r.mluvnost) * f);
    }
    const pub = verejnePodezreni();
    const op = new Map<number, number[]>();
    for (const i of listeners) {
      const h = H[i]!;
      const m = h.mysl.marginaly();
      const v = new Array<number>(n).fill(-4);
      for (const t of cile) {
        if (t === i) continue;
        let l = logit(m[t]!) + h.soc[t]! + h.zloba[t]! + h.sumKolo[t]!;
        if (h.pritel === t) l -= h.r.loajalita * 1.8;
        v[t] = l;
      }
      if (h.role === 'saboter') {
        // sabotér říká stolu to, co se hodí: partnery brání a na jednoho pracanta tlačí
        const prac = pracantiZivi();
        const cil = plan != null && coin(h.r.koordinace) ? plan : prac.length ? prac[argmax(prac, podezreni(h, prac))]! : null;
        for (const t of cile) {
          if (t === i) continue;
          v[t] = H[t]!.role === 'saboter' ? -1.5 : logit(pub[t]!) + h.sumKolo[t]! * 0.3;
        }
        if (cil != null) v[cil] = v[cil]! + 1.8;
      }
      if (coin(h.r.trollovani * 0.5)) v[pickOf(cile.filter((t) => t !== i))] = 3;
      op.set(i, v);
    }
    // kdo je čí hlavní podezřelý: kvůli pomstě a statistice
    for (const [i, v] of op) {
      if (!mluvi.has(i)) continue;
      let t = -1;
      for (const c of cile) if (c !== i && (t < 0 || v[c]! > v[t]!)) t = c;
      if (t < 0 || v[t]! < logit(0.3)) continue;
      H[t]!.zloba[i] = Math.min(1.5, H[t]!.zloba[i]! + H[t]!.r.mstivost * 0.35);
      if (H[i]!.role === 'pracant' && rolePodleSedadla[t] === 'saboter') tlakNaSabotery[i]! += 1;
    }
    const kolSbl = K.rozprava >= 2 ? 4 : K.rozprava >= 1.5 ? 3 : 2;
    for (let kolo2 = 0; kolo2 < kolSbl; kolo2++) {
      const dalsi = new Map<number, number[]>();
      for (const j of listeners) {
        const h = H[j]!;
        const m = h.mysl.marginaly();
        const vlastni = op.get(j)!;
        const num = new Array<number>(n).fill(0);
        let jmen = 0;
        for (const [i, voice] of mluvi) {
          if (i === j) continue;
          const mluvci = H[i]!;
          let duvera = h.role === 'saboter' ? 1 : 1 - m[i]!;
          if (h.pritel === i) duvera *= 1 + h.r.loajalita;
          const w = voice * duvera;
          if (w <= 0) continue;
          const e = op.get(i)!;
          // sebeobhajoba: každý tvrdí, že on to není. Lháře může čtení lidí prohlédnout.
          const lhar = mluvci.role === 'saboter' ? zaklad(mluvci.r.lhani * K.lhani) : 1;
          const prohlednuti = mluvci.role === 'saboter' ? 0.8 * zaklad(h.r.detekce * K.detekce) * (1 - 0.6 * lhar) : 0;
          const obhajoba = -2.5 * (0.4 + 0.6 * mluvci.r.presvedcivost) * (1 - prohlednuti) * (mluvci.role === 'saboter' ? 0.4 + 0.6 * lhar : 1);
          for (const t of cile) num[t]! += w * (t === i ? obhajoba : e[t]!);
          jmen += w;
        }
        if (jmen <= 0) { dalsi.set(j, vlastni); continue; }
        const lam = h.role === 'saboter' ? 0.5 : zaklad((0.1 + 0.75 * h.r.sugestibilita) * K.presvedcovani, 0, 0.95);
        const nove = vlastni.slice();
        for (const t of cile) {
          if (t === j) continue;
          nove[t] = (1 - lam) * vlastni[t]! + lam * (num[t]! / jmen);
          h.soc[t] = h.soc[t]! + (nove[t]! - vlastni[t]!);
        }
        dalsi.set(j, nove);
      }
      for (const [i, v] of dalsi) op.set(i, v);
    }

    if (s.faze === 'rozprava') akce({ typ: 'DALSI_FAZE' });
    trace(`  rozprava: ${tvrzeni.length} tvrzení (${tvrzeni.filter((x) => x.lez).length} lží), mluví ${mluvi.size}${skratilo ? ', zkráceno' : ''}`);
  }

  function jmenujePartnera(t: Tvrzeni, h: H): boolean {
    const ids = t.typ === 'cisty' ? [t.kdo] : t.typ === 'nejsou_vsichni' || t.typ === 'aspon_jeden' ? t.kdo : t.typ === 'hlas' ? [t.cil] : [];
    return ids.some((id) => doIdx(id) !== h.i && H[doIdx(id)]!.role === 'saboter');
  }

  // ---------------------------------------------------------------- nominace a rada

  function nominace(h: H): number | null {
    const kruh = zivi().filter((j) => j !== h.i);
    if (!kruh.length) return null;
    if (coin(h.r.trollovani * 0.5)) return pickOf(kruh);
    if (coin(h.r.zdrzenlivost * 0.3)) return null;
    let cil: number;
    let p: number;
    if (h.role === 'saboter') {
      const prac = kruh.filter((j) => H[j]!.role === 'pracant');
      if (!prac.length) return null;
      const plan = planSaboteru();
      if (plan != null && coin(h.r.koordinace)) { cil = plan; p = 1; }
      else {
        const ps = podezreni(h, prac);
        const k = argmax(prac, ps);
        cil = prac[k]!; p = ps[k]!;
      }
      // sabotér, který nikoho nenominuje, vypadá podezřele
      return coin(0.85 + 0.1 * h.r.odvaha) ? cil : null;
    }
    const ps = podezreni(h, kruh);
    const k = argmax(kruh, ps);
    cil = kruh[k]!; p = ps[k]!;
    if (h.pritel === cil && p < 0.85) return null;
    const prah = 0.62 - 0.35 * h.r.odvaha;
    return p >= prah ? cil : null;
  }

  function hlas(h: H): { cil: number } | 'zdrzet' | null {
    const kand = s.aktualni!.kandidati.map(doIdx);
    const moznosti = kand.filter((c) => c !== h.i);
    const zivyHrac = jeZivy(h.i);
    if (!zivyHrac && s.hraci[h.i]!.hlasStinuUtracen) return null;
    if (!moznosti.length) return zivyHrac ? 'zdrzet' : null;
    if (coin(h.r.trollovani * 0.4)) return { cil: pickOf(moznosti) };

    let cil: number;
    let jistota: number;
    if (h.role === 'saboter') {
      const partneri = moznosti.filter((c) => H[c]!.role === 'saboter');
      const prac = moznosti.filter((c) => H[c]!.role === 'pracant');
      const pub = verejnePodezreni();
      if (partneri.length && prac.length) {
        // dilema: obětovat partnera, když už je stejně ztracený, a získat tím důvěru
        const expozice = Math.max(...partneri.map((c) => pub[c]!));
        const pObet = h.r.obetovani * 0.9 * zaklad((expozice - 0.35) * 2.2) * zaklad(K.chytrost);
        if (coin(pObet)) { cil = partneri[argmax(partneri, partneri.map((c) => pub[c]!))]!; jistota = 0.9; }
        else { cil = prac[argmax(prac, prac.map((c) => pub[c]!))]!; jistota = 0.8; }
      } else if (prac.length) {
        const plan = planSaboteru();
        if (plan != null && prac.includes(plan) && coin(h.r.koordinace)) cil = plan;
        else cil = prac[argmax(prac, prac.map((c) => pub[c]!))]!;
        jistota = 0.8;
      } else {
        // oba kandidáti jsou sabotéři: obětuje toho, kdo je víc na očích
        if (!coin(h.r.obetovani)) return zivyHrac ? 'zdrzet' : null;
        cil = partneri[argmax(partneri, partneri.map((c) => pub[c]!))]!;
        jistota = 0.9;
      }
    } else {
      const ps = podezreni(h, moznosti);
      const k = argmax(moznosti, ps);
      cil = moznosti[k]!; jistota = ps[k]!;
      if (h.pritel === cil && jistota < 0.85) return zivyHrac ? 'zdrzet' : null;
      const prah = 0.5 - 0.3 * h.r.odvaha;
      if (jistota < prah && coin(0.5 + 0.5 * h.r.zdrzenlivost)) return zivyHrac ? 'zdrzet' : null;
      if (coin(h.r.zdrzenlivost * 0.2)) return zivyHrac ? 'zdrzet' : null;
    }
    if (!zivyHrac) {
      // Stín má jediný hlas na celou hru a neutratí ho jen tak
      const pozdni = s.kolo >= s.limitSicht - 1 ? 0.5 : 0;
      const spend = h.r.netrpelivost * 0.45 + pozdni + (jistota > 0.6 ? 0.3 : 0);
      if (!coin(spend)) return null;
    }
    return { cil };
  }

  function posledniSlovo() {
    const kand = s.aktualni!.kandidati.map(doIdx);
    for (const c of kand) {
      const obhajce = H[c]!;
      const obrana = obhajce.r.presvedcivost * (obhajce.role === 'saboter' ? zaklad(obhajce.r.lhani * K.lhani) : 0.9);
      for (const j of [...zivi(), ...stiny()]) {
        const h = H[j]!;
        if (j === c || h.role === 'saboter') continue;
        const prohlednuti = obhajce.role === 'saboter' ? 0.7 * zaklad(h.r.detekce * K.detekce) : 0;
        h.soc[c] = h.soc[c]! - h.r.sugestibilita * 0.9 * obrana * (1 - prohlednuti) * K.presvedcovani;
      }
    }
  }

  function ingestRady() {
    const pv = pohledPro(s, idDo(0)).stul;
    const vyh = pv.vyhosteny;
    const k = s.aktualni!;
    const hl = pv.hlasy.map((x) => ({ kdo: doIdx(x.kdo), komu: doIdx(x.komu) }));
    rady.set(s.kolo, k.tma ? null : hl);
    for (const x of hl) {
      stat[x.kdo]!.hlasu += 1;
      if (H[x.kdo]!.role === 'pracant' && rolePodleSedadla[x.komu] === 'saboter') stat[x.kdo]!.hlasuNaSaboteryPracantem += 1;
      if (rolePodleSedadla[x.komu] === 'saboter') hlasyNaSabotery[x.kdo]! += 1;
    }
    // hlas stínu se do `hlasy` počítá taky, stejně jako ve hře
    if (vyh) {
      const v = doIdx(vyh);
      const role = pv.roleVyhosteneho!;
      verejne.set(v, role);
      stat[v]!.vyhosten = true;
      for (const h of H) {
        h.mysl.tvrde((m) => (((m >> v) & 1) === 1) === (role === 'saboter'));
        if (!coin(zapamatuje(h))) continue;
        const sila = vyuziti(h) * 0.8;
        for (const x of hl) {
          if (x.komu !== v || x.kdo === h.i) continue;
          const kdo = x.kdo;
          h.mysl.mekke((m) => (role === 'saboter' ? (((m >> kdo) & 1) ? 0.25 : 1) : (((m >> kdo) & 1) ? 1 : 0.85)), sila);
        }
      }
    }
    for (const h of H) for (const x of hl) if (x.komu === h.i) h.zloba[x.kdo] = Math.min(1.5, h.zloba[x.kdo]! + h.r.mstivost * 0.8);
    kolo(k.cislo).vyhostenaRole = vyh ? pv.roleVyhosteneho : null;
  }

  // ---------------------------------------------------------------- noc

  function vyberOdmenu(h: H, odmeny: Odmena[]): { odmena: Odmena; cil?: string } {
    const pub = verejnePodezreni();
    const sab = saboteriZivi();
    const nejvic = sab[argmax(sab, sab.map((j) => pub[j]!))]!;
    const expozice = pub[nejvic]!;
    const chytre = zaklad(K.chytrost);
    const chrani = h.r.pravidla * 0.6 * chytre * zaklad((expozice - 0.35) * 3);
    if (odmeny.includes('imunita') && coin(chrani)) return { odmena: 'imunita', cil: idDo(nejvic) };
    if (odmeny.includes('vrazda')) {
      const tma = 0.1 * (1 - h.r.odvaha) + (expozice > 0.4 ? 0.1 * h.r.lhani : 0);
      if (odmeny.includes('tma') && coin(tma)) return { odmena: 'tma' };
      return { odmena: 'vrazda' };
    }
    if (expozice > 0.4 || coin(0.5)) return { odmena: 'imunita', cil: idDo(nejvic) };
    return { odmena: 'tma' };
  }

  function vybratObet(h: H): number | null {
    const prac = pracantiZivi();
    if (!prac.length) return null;
    if (z.saboteriMlci) {
      // starý bot zabíjí toho, komu stůl nejvíc věří
      const pub = verejnePodezreni();
      return prac[argmax(prac, prac.map((j) => -pub[j]!))]!;
    }
    const pHrozba = 0.1 + 0.7 * (0.5 * h.r.pravidla + 0.5 * h.r.lhani) * zaklad(K.chytrost);
    const pMsta = 0.1 + 0.6 * h.r.mstivost;
    const los = R() * (pHrozba + pMsta + 0.3);
    if (los < pHrozba) return prac[argmax(prac, prac.map((j) => hrozba(j) + R() * 0.3))]!;
    if (los < pHrozba + pMsta) return prac[argmax(prac, prac.map((j) => hlasyNaSabotery[j]! + R() * 0.3))]!;
    return pickOf(prac);
  }

  function nocniKrok() {
    const odmeny = dostupneOdmeny(s);
    const predak = H[doIdx(s.predak!)]!;
    let nejpozdeji = 0;
    let zmeskal = false;
    if (odmeny.length && stiha(predak)) {
      const v = vyberOdmenu(predak, odmeny);
      akce({ typ: 'VYBRAT_ODMENU', odmena: v.odmena, cil: v.cil });
      nejpozdeji = Math.max(nejpozdeji, reakce(predak, 25));
      if (v.odmena === 'vrazda') {
        const navrhy: number[] = [];
        for (const i of saboteriZivi()) {
          if (i === predak.i) continue;
          if (!stiha(H[i]!)) continue;
          const cil = vybratObet(H[i]!);
          if (cil != null) { akce({ typ: 'NAVRHNOUT_OBET', id: idDo(i), cil: idDo(cil) }); navrhy.push(cil); }
        }
        let cil = vybratObet(predak);
        if (navrhy.length && coin(0.55)) cil = pickOf(navrhy);
        if (cil != null) akce({ typ: 'PREDAK_ROZHODL', cil: idDo(cil) });
      }
    } else if (odmeny.length) zmeskal = true;
    for (const i of zivi()) {
      if (!stiha(H[i]!)) zmeskal = true;
      else nejpozdeji = Math.max(nejpozdeji, reakce(H[i]!, 25));
    }
    sekundy += zmeskal ? 60 : Math.min(60, nejpozdeji) + 8;
  }

  // ---------------------------------------------------------------- kolo ve statistice

  function kolo(cislo: number): KoloStat {
    let k = kolaStat.find((x) => x.cislo === cislo);
    if (!k) {
      k = { cislo, padla: false, sabotazi: 0, partaSabotaru: 0, kandidatu: 0, hlasu: 0, vyhostenaRole: null, odmena: null, obet: false, tma: false, imunita: false };
      kolaStat.push(k);
    }
    return k;
  }

  // ---------------------------------------------------------------- hlavní smyčka

  for (let i = 0; i < n; i++) akce({ typ: 'PRIPRAVEN', id: idDo(i) });
  trace(`start: ${n} hráčů, ${S} sabotérů, limit ${s.limitSicht}; sabotéři: ${saboteriZivi().map((i) => H[i]!.persona.jmeno).join(', ')}`);

  let kroky = 0;
  while (s.faze !== 'konec' && kroky++ < 800) {
    switch (s.faze) {
      case 'predel': {
        for (const h of H) {
          for (let j = 0; j < n; j++) { h.soc[j]! *= 0.5; h.sumKolo[j] = gauss() * h.r.sum * K.sum * 0.6; }
        }
        sekundy += 2;
        trace(`kolo ${s.kolo}`);
        akce({ typ: 'DALSI_FAZE' });
        break;
      }
      case 'zadani':
        sekundy += 15;
        akce({ typ: 'DALSI_FAZE' });
        break;

      case 'sichta': {
        const sm = s.aktualni!.smeny[s.aktualni!.smeny.length - 1]!;
        const partaIdx = sm.parta.map(doIdx);
        let nejpozdeji = 0;
        let zmeskal = false;
        for (const i of partaIdx) {
          const h = H[i]!;
          if (!stiha(h)) { zmeskal = true; continue; }
          const volba = h.role === 'saboter' && kazi(h, partaIdx) ? 'kazit' : 'makat';
          if (volba === 'kazit') stat[i]!.kazil += 1;
          akce({ typ: 'VOLBA_SICHTY', id: idDo(i), volba });
          nejpozdeji = Math.max(nejpozdeji, reakce(h, 7));
        }
        sekundy += zmeskal ? 45 : Math.min(45, nejpozdeji) + 2;
        akce({ typ: 'DALSI_FAZE' });
        break;
      }
      case 'vysledek': {
        const pv = pohledPro(s, idDo(0)).stul;
        const parta = pv.parta.map(doIdx);
        const c = pv.sabotazi ?? 0;
        sichty.push({ kolo: s.kolo, parta, c });
        ingestSichty(parta, c);
        const k = kolo(s.kolo);
        k.padla = pv.padla === true;
        k.sabotazi = c;
        k.partaSabotaru = parta.filter((i) => rolePodleSedadla[i] === 'saboter').length;
        sekundy += 22;
        akce({ typ: 'DALSI_FAZE' });
        break;
      }
      case 'septanda': {
        const pravdy = s.aktualni!.pravdy;
        const text = new Map<string, Tvrzeni>();
        for (const t of pravdy) text.set(vetaZTvrzeni(t, jm), t);
        for (const h of H) h.vlastni = null;
        for (const i of zivi()) {
          const veta = pohledPro(s, idDo(i)).ja.septanda;
          const t = veta ? text.get(veta) ?? null : null;
          H[i]!.vlastni = t;
          // Vlastní věta je pravdivá, takže ji pracant bere jako jistotu. Sabotér ví víc než ona.
          if (t && H[i]!.role === 'pracant') {
            const cond = podminkaTvrzeni(t, doIdx, (k) => rady.get(k) ?? null, (k) => sichty.find((x) => x.kolo === k)?.parta ?? null);
            if (cond) H[i]!.mysl.tvrde(cond);
          }
        }
        sekundy += 20;
        akce({ typ: 'DALSI_FAZE' });
        break;
      }
      case 'rozprava':
        rozprava();
        break;

      case 'nominace': {
        if (z.sonda) {
          for (const i of pracantiZivi()) {
            const hh = H[i]!;
            const kruh = zivi().filter((j) => j !== i);
            const m = hh.mysl.marginaly();
            const rawTop = kruh[argmax(kruh, kruh.map((j) => m[j]!))]!;
            const fullTop = kruh[argmax(kruh, podezreni(hh, kruh))]!;
            z.sonda(s.kolo, rolePodleSedadla[rawTop] === 'saboter', rolePodleSedadla[fullTop] === 'saboter');
          }
        }
        let nejpozdeji = 0;
        let zmeskal = false;
        for (const i of zivi()) {
          const h = H[i]!;
          if (!stiha(h)) { zmeskal = true; continue; }
          const cil = nominace(h);
          nejpozdeji = Math.max(nejpozdeji, reakce(h, 20));
          if (cil == null) akce({ typ: 'NENOMINUJU', id: idDo(i) });
          else {
            akce({ typ: 'NOMINOVAT', id: idDo(i), cil: idDo(cil) });
            stat[i]!.nominaci += 1;
            if (rolePodleSedadla[cil] === 'saboter' && h.role === 'pracant') stat[i]!.nominaciNaSabotery += 1;
          }
        }
        sekundy += zmeskal ? 60 : Math.min(60, nejpozdeji) + 2;
        akce({ typ: 'DALSI_FAZE' });
        const k = kolo(s.aktualni!.cislo);
        k.kandidatu = s.aktualni!.kandidati.length;
        k.tma = s.aktualni!.tma;
        k.imunita = s.aktualni!.imunni != null;
        break;
      }
      case 'kandidati':
        sekundy += 15;
        akce({ typ: 'DALSI_FAZE' });
        break;
      case 'posledni_slovo': {
        const kand = s.aktualni!.kandidati;
        if (s.aktualni!.mluvi === 0) posledniSlovo();
        sekundy += delkaFaze('posledni_slovo', zivi().length, kand.length);
        akce({ typ: 'DALSI_FAZE' });
        break;
      }
      case 'rada': {
        let nejpozdeji = 0;
        let zmeskal = false;
        for (const i of [...zivi(), ...stiny()]) {
          const h = H[i]!;
          if (!jeZivy(i) && s.hraci[i]!.hlasStinuUtracen) continue;
          if (!stiha(h)) { zmeskal = true; continue; }
          const v = hlas(h);
          if (v == null) { if (!jeZivy(i) && !coin(0.7)) zmeskal = true; else if (!jeZivy(i)) akce({ typ: 'ZDRZUJU_SE', id: idDo(i) }); continue; }
          if (v === 'zdrzet') akce({ typ: 'ZDRZUJU_SE', id: idDo(i) });
          else akce({ typ: 'HLASOVAT', id: idDo(i), cil: idDo(v.cil) });
          nejpozdeji = Math.max(nejpozdeji, reakce(h, 10));
        }
        sekundy += zmeskal ? 45 : Math.min(45, nejpozdeji) + 2;
        akce({ typ: 'DALSI_FAZE' });
        break;
      }
      case 'hlasy':
        sekundy += 18;
        kolo(s.aktualni!.cislo).hlasu = Object.keys(s.aktualni!.hlasy).length + Object.keys(s.aktualni!.hlasyStinu).length;
        akce({ typ: 'DALSI_FAZE' });
        break;
      case 'vyhosteni': {
        ingestRady();
        const v = s.aktualni!.vyhosteny;
        if (v) trace(`  vyhoštěn ${H[doIdx(v)]!.persona.jmeno} (${rolePodleSedadla[doIdx(v)]})`);
        sekundy += 15;
        akce({ typ: 'DALSI_FAZE' });
        break;
      }
      case 'noc':
        nocniKrok();
        kolo(s.aktualni!.cislo).odmena = s.aktualni!.odmena;
        akce({ typ: 'DALSI_FAZE' });
        break;
      case 'rano': {
        const o = s.aktualni!.obet;
        const k = kolo(s.aktualni!.cislo);
        if (o) {
          const v = doIdx(o);
          k.obet = true;
          stat[v]!.zavrazden = true;
          verejne.set(v, 'pracant');
          for (const h of H) if (coin(0.4 + 0.6 * h.r.pravidla)) h.mysl.tvrde((m) => ((m >> v) & 1) === 0);
          trace(`  noc: ${s.aktualni!.odmena}, oběť ${H[v]!.persona.jmeno}`);
        } else trace(`  noc: ${s.aktualni!.odmena ?? 'nic'}`);
        sekundy += 15;
        akce({ typ: 'DALSI_FAZE' });
        break;
      }
      case 'rozdani':
        anomalie = 'uvízl v rozdání';
        akce({ typ: 'DALSI_FAZE' });
        break;
      default:
        anomalie = `neznámá fáze ${s.faze}`;
        akce({ typ: 'DALSI_FAZE' });
    }
  }
  if (s.faze !== 'konec') {
    anomalie = `nedohrálo se, fáze ${s.faze}`;
    akce({ typ: 'UKONCIT' });
  }

  // ---- výsledek
  for (const k of s.historie) {
    const sm = k.smeny[k.smeny.length - 1];
    const ks = kolo(k.cislo);
    ks.padla = sm?.padla === true;
    ks.sabotazi = sm?.sabotazi ?? 0;
    ks.odmena = k.odmena;
  }
  const vitez = s.vitez;
  for (const h of H) {
    const st = stat[h.i]!;
    st.zivyNaKonci = jeZivy(h.i);
    st.vyhral = vitez != null && (vitez === 'saboteri') === (h.role === 'saboter');
  }
  trace(`konec: ${vitez} (${s.duvodKonce})`);
  return {
    n, saboteru: S, limit: s.limitSicht, vitez, duvod: s.duvodKonce ?? '',
    kol: s.kolo, kola: kolaStat.sort((a, b) => a.cislo - b.cislo), sekundy, anomalie, hraci: stat,
    rysy: H.map((h) => h.r),
  };
}
