/**
 * Šichta: simulace s personami.
 *
 *   npx vite-node docs/persony/spust.ts <pokus> [--games N] [--seed N]
 *
 * Pokusy: kalibrace, zaklad, scenare, persony, dvojice, citlivost, vecer, nastaveni
 *
 * Každá partie je odehraná skutečným reducerem (viz `hra.ts`). Výsledky se
 * tisknou jako tabulky v markdownu a ukládají do `docs/persony/vysledky/`.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { hrajPartii, type Parametry, type VysledekPartie, type Zadani } from './hra';
import { PERSONY, ROBOT, SCENARE, UROVNE, type Persona, type Rysy, type Scenar } from './persony';
import { rng } from '../../src/game/random';
import { sestavaPro, type Uroven } from '../../src/game/rules';

const argv = process.argv.slice(2);
const pokus = argv[0] ?? 'zaklad';
const argOf = (jmeno: string, vychozi: number) => {
  const i = argv.indexOf(`--${jmeno}`);
  return i >= 0 && argv[i + 1] ? Number(argv[i + 1]) : vychozi;
};
const HER = argOf('games', 2000);
const SEED = argOf('seed', 1);
const VYSTUP = fileURLToPath(new URL('./vysledky/', import.meta.url));
mkdirSync(VYSTUP, { recursive: true });

const pct = (x: number, d = 1) => `${(x * 100).toFixed(d)} %`;
const num = (x: number, d = 1) => x.toFixed(d);
const radek = (...bunky: (string | number)[]) => `| ${bunky.join(' | ')} |`;
const hlavicka = (...sloupce: string[]) => [radek(...sloupce), radek(...sloupce.map(() => '---'))];

function ulozit(jmeno: string, radky: string[]) {
  const text = radky.join('\n') + '\n';
  console.log(text);
  writeFileSync(`${VYSTUP}${jmeno}`, text, 'utf8');
  console.log(`(uloženo: docs/persony/vysledky/${jmeno})`);
}

// ---------------------------------------------------------------- agregace

export class Agg {
  partii = 0;
  vyhraliPracanti = 0;
  konec = { sabotery: 0, vybiti: 0, limit: 0, jine: 0 };
  kol = 0;
  sekundy = 0;
  anomalie = 0;
  anomalieText = new Set<string>();
  kolaCelkem = 0;
  padlaKol = 0;
  dvojiteSabotaze = 0;
  kolaSAsponJednimSabotjerem = 0;
  vyhostenoSab = 0;
  vyhostenoPrac = 0;
  koloBezKandidata = 0;
  radaBezVyhosteni = 0;
  radSKandidatem = 0;
  vrazdy = 0;
  imunity = 0;
  tmy = 0;
  noci = 0;
  zivychNaKonciPrac = 0;
  zivychNaKonciSab = 0;
  hlasuCelkem = 0;
  hlasuTrefa = 0;
  nominaciCelkem = 0;
  nominaciTrefa = 0;
  /** Po kolika kolech padlo první vyhoštění sabotéra. */
  prvniSabKola = 0;
  prvniSabPartii = 0;

  pridej(r: VysledekPartie) {
    this.partii++;
    if (r.vitez === 'pracanti') this.vyhraliPracanti++;
    if (r.anomalie) { this.anomalie++; this.anomalieText.add(r.anomalie); }
    if (r.duvod.startsWith('Poslední')) this.konec.sabotery++;
    else if (r.duvod.startsWith('U stolu')) this.konec.vybiti++;
    else if (r.duvod.startsWith('Došly')) this.konec.limit++;
    else this.konec.jine++;
    this.kol += r.kol;
    this.sekundy += r.sekundy;
    let prvni = true;
    for (const k of r.kola) {
      this.kolaCelkem++;
      if (k.padla) this.padlaKol++;
      if (k.sabotazi >= 2) this.dvojiteSabotaze++;
      if (k.partaSabotaru >= 1) this.kolaSAsponJednimSabotjerem++;
      if (k.vyhostenaRole === 'saboter') this.vyhostenoSab++;
      if (k.vyhostenaRole === 'pracant') this.vyhostenoPrac++;
      if (k.kandidatu === 0) this.koloBezKandidata++;
      else {
        this.radSKandidatem++;
        if (!k.vyhostenaRole) this.radaBezVyhosteni++;
      }
      if (k.padla) {
        this.noci++;
        if (k.odmena === 'vrazda') this.vrazdy++;
        else if (k.odmena === 'imunita') this.imunity++;
        else if (k.odmena === 'tma') this.tmy++;
      }
      if (prvni && k.vyhostenaRole === 'saboter') { prvni = false; this.prvniSabKola += k.cislo; this.prvniSabPartii++; }
    }
    for (const h of r.hraci) {
      if (h.zivyNaKonci) { if (h.role === 'pracant') this.zivychNaKonciPrac++; else this.zivychNaKonciSab++; }
      if (h.role === 'pracant') {
        this.hlasuCelkem += h.hlasu;
        this.hlasuTrefa += h.hlasuNaSaboteryPracantem;
        this.nominaciCelkem += h.nominaci;
        this.nominaciTrefa += h.nominaciNaSabotery;
      }
    }
  }

  get winrate() { return this.vyhraliPracanti / Math.max(1, this.partii); }
  /** Poloviční šířka 95% intervalu spolehlivosti pro podíl. */
  get ci() { const p = this.winrate; return 1.96 * Math.sqrt((p * (1 - p)) / Math.max(1, this.partii)); }
  get minut() { return this.sekundy / Math.max(1, this.partii) / 60; }
  get kolPrumer() { return this.kol / Math.max(1, this.partii); }
  podil(x: number) { return x / Math.max(1, this.partii); }
}

// ---------------------------------------------------------------- losování stolů

const zamichej = <T,>(a: T[], R: () => number): T[] => {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!]; }
  return a;
};

export function nahodnyStul(sc: Scenar, n: number, R: () => number, vynechat: string[] = []): { osoby: Persona[]; pritele: [number, number][] } {
  const vsechny = Object.keys(sc.vahy).length ? PERSONY.filter((p) => (sc.vahy[p.klic] ?? 0) > 0) : PERSONY;
  const pocty = new Map<string, number>(vynechat.map((k) => [k, 0]));
  const osoby: Persona[] = [];
  while (osoby.length < n) {
    const kandidati = vsechny.filter((p) => (pocty.get(p.klic) ?? 0) < 2 && !vynechat.includes(p.klic));
    if (!kandidati.length) break;
    const suma = kandidati.reduce((a, p) => a + (Object.keys(sc.vahy).length ? sc.vahy[p.klic]! : 1), 0);
    let los = R() * suma;
    let vybrany = kandidati[kandidati.length - 1]!;
    for (const p of kandidati) {
      los -= Object.keys(sc.vahy).length ? sc.vahy[p.klic]! : 1;
      if (los <= 0) { vybrany = p; break; }
    }
    osoby.push(vybrany);
    pocty.set(vybrany.klic, (pocty.get(vybrany.klic) ?? 0) + 1);
  }
  zamichej(osoby, R);
  const sedadla = zamichej(osoby.map((_, i) => i), R);
  const pritele: [number, number][] = [];
  for (let k = 0; k < sc.pary && sedadla.length >= 2; k++) pritele.push([sedadla.pop()!, sedadla.pop()!]);
  return { osoby, pritele };
}

/** Odehraje `her` partií na náhodných stolech scénáře. */
export function behScenare(sc: Scenar, n: number, her: number, seedBase: number, extra: Partial<Zadani> = {}, surove?: VysledekPartie[]) {
  const agg = new Agg();
  const R = rng(seedBase * 7919 + n * 131 + sc.klic.length);
  for (let g = 0; g < her; g++) {
    const stul = nahodnyStul(sc, n, R);
    const r = hrajPartii({ ...stul, uprava: sc.uprava, seed: seedBase * 100003 + n * 1009 + g + 1, ...extra });
    agg.pridej(r);
    surove?.push(r);
  }
  return agg;
}

const MIX = SCENARE.find((s) => s.klic === 'mix')!;
const SABOTERI: Record<number, number> = { 5: 1, 6: 2, 7: 2, 8: 2, 9: 3, 10: 3, 11: 3, 12: 4 };
const LIMIT: Record<number, number> = { 5: 3, 6: 4, 7: 3, 8: 3, 9: 6, 10: 5, 11: 5, 12: 7 };
const VELIKOSTI = [5, 6, 7, 8, 9, 10, 11, 12];

// ---------------------------------------------------------------- pokusy

/** Starý simulátor (docs/balance-sim.mjs), jak je v design.md §3.1. */
const BOT_V_DOKUMENTACI: Record<number, string> = { 6: '48', 7: '46', 8: '44', 9: '40', 10: '47', 11: '46', 12: '38' };

function kalibrace() {
  const out = hlavicka('Hráčů', 'Bot v design.md', 'Roboti v enginu', '±', 'Limit padne', 'Kol');
  for (const n of VELIKOSTI) {
    const agg = new Agg();
    for (let g = 0; g < HER; g++) {
      agg.pridej(hrajPartii({ osoby: Array<Persona>(n).fill(ROBOT), seed: SEED * 100003 + n * 1009 + g + 1, saboteriMlci: true }));
    }
    out.push(radek(n, BOT_V_DOKUMENTACI[n] ? `${BOT_V_DOKUMENTACI[n]} %` : 'n/a', pct(agg.winrate), pct(agg.ci, 1), pct(agg.podil(agg.konec.limit), 0), num(agg.kolPrumer)));
  }
  ulozit('kalibrace.md', out);
}

function zaklad() {
  const t1 = hlavicka('Hráčů', 'Sab.', 'Limit', 'Pracanti', '±', 'Sabotéři vyhrají limitem', 'Sabotéři vybijí stůl', 'Kol', 'Minut', 'Rada bez vyhoštění');
  const t2 = hlavicka('Hráčů', 'Padlých šicht', 'Dvojitá sabotáž', 'Vyhoštěn sab. / partii', 'Vyhoštěn prac. / partii', 'Vražda / padlá noc', 'Imunita', 'Tma', 'Přesnost nominací', 'Přesnost hlasů');
  for (const n of VELIKOSTI) {
    const agg = behScenare(MIX, n, HER, SEED);
    t1.push(radek(n, SABOTERI[n]!, LIMIT[n]!, pct(agg.winrate), pct(agg.ci, 1), pct(agg.podil(agg.konec.limit), 0), pct(agg.podil(agg.konec.vybiti), 0), num(agg.kolPrumer), num(agg.minut, 0), pct(agg.radaBezVyhosteni / Math.max(1, agg.radSKandidatem), 0)));
    t2.push(radek(n, pct(agg.padlaKol / agg.kolaCelkem, 0), pct(agg.dvojiteSabotaze / Math.max(1, agg.padlaKol), 0), num(agg.vyhostenoSab / agg.partii, 2), num(agg.vyhostenoPrac / agg.partii, 2), pct(agg.vrazdy / Math.max(1, agg.noci), 0), pct(agg.imunity / Math.max(1, agg.noci), 0), pct(agg.tmy / Math.max(1, agg.noci), 0), pct(agg.nominaciTrefa / Math.max(1, agg.nominaciCelkem), 0), pct(agg.hlasuTrefa / Math.max(1, agg.hlasuCelkem), 0)));
    if (agg.anomalie) console.log(`!! n=${n}: anomálie ${agg.anomalie}: ${[...agg.anomalieText].join('; ')}`);
  }
  ulozit('zaklad.md', [...t1, '', ...t2]);
}

function scenare() {
  const out = hlavicka('Stůl', 'Hráčů', 'Pracanti', '±', 'Limit padne', 'Kol', 'Minut', 'Rada bez vyhoštění');
  for (const sc of SCENARE) {
    if (sc.vecer) continue;
    for (const n of sc.velikosti) {
      const agg = behScenare(sc, n, HER, SEED);
      out.push(radek(sc.nazev, n, pct(agg.winrate), pct(agg.ci, 1), pct(agg.podil(agg.konec.limit), 0), num(agg.kolPrumer), num(agg.minut, 0), pct(agg.radaBezVyhosteni / Math.max(1, agg.radSKandidatem), 0)));
      if (agg.anomalie) console.log(`!! ${sc.klic} n=${n}: anomálie ${agg.anomalie}: ${[...agg.anomalieText].join('; ')}`);
    }
  }
  ulozit('scenare.md', out);
}

interface PerPersona {
  prac: { hrano: number; vyhral: number; zivy: number; zbytecnaVyhosten: number; zavrazden: number; nom: number; nomT: number; hl: number; hlT: number };
  sab: { hrano: number; vyhral: number; vyhosten: number; kazil: number };
}
const novyPP = (): PerPersona => ({
  prac: { hrano: 0, vyhral: 0, zivy: 0, zbytecnaVyhosten: 0, zavrazden: 0, nom: 0, nomT: 0, hl: 0, hlT: 0 },
  sab: { hrano: 0, vyhral: 0, vyhosten: 0, kazil: 0 },
});

function persony() {
  const pp = new Map<string, PerPersona>(PERSONY.map((p) => [p.klic, novyPP()]));
  let celkemPrac = 0, vyhralPrac = 0, celkemSab = 0, vyhralSab = 0;
  for (const n of [6, 7, 8, 9, 10, 11, 12]) {
    const r: VysledekPartie[] = [];
    behScenare(MIX, n, HER, SEED + 50, {}, r);
    for (const g of r) {
      for (const h of g.hraci) {
        const x = pp.get(h.persona)!;
        if (h.role === 'pracant') {
          x.prac.hrano++; celkemPrac++;
          if (h.vyhral) { x.prac.vyhral++; vyhralPrac++; }
          if (h.zivyNaKonci) x.prac.zivy++;
          if (h.vyhosten) x.prac.zbytecnaVyhosten++;
          if (h.zavrazden) x.prac.zavrazden++;
          x.prac.nom += h.nominaci; x.prac.nomT += h.nominaciNaSabotery;
          x.prac.hl += h.hlasu; x.prac.hlT += h.hlasuNaSaboteryPracantem;
        } else {
          x.sab.hrano++; celkemSab++;
          if (h.vyhral) { x.sab.vyhral++; vyhralSab++; }
          if (h.vyhosten) x.sab.vyhosten++;
          x.sab.kazil += h.kazil;
        }
      }
    }
  }
  const zakladPrac = vyhralPrac / celkemPrac;
  const zakladSab = vyhralSab / celkemSab;
  const t1 = hlavicka('Persona', 'Partií', 'Tým pracantů vyhrál', 'Δ proti průměru', 'Přežil', 'Vyhoštěn nevinně', 'Zavražděn', 'Přesnost nominací', 'Přesnost hlasů');
  const radky1 = PERSONY.map((p) => {
    const x = pp.get(p.klic)!.prac;
    return { p, x, d: x.vyhral / x.hrano - zakladPrac };
  }).sort((a, b) => b.d - a.d);
  for (const { p, x, d } of radky1) {
    t1.push(radek(`${p.jmeno} (${p.prezdivka})`, x.hrano, pct(x.vyhral / x.hrano), `${d >= 0 ? '+' : ''}${(d * 100).toFixed(1)} b.`, pct(x.zivy / x.hrano, 0), pct(x.zbytecnaVyhosten / x.hrano, 0), pct(x.zavrazden / x.hrano, 0), pct(x.nomT / Math.max(1, x.nom), 0), pct(x.hlT / Math.max(1, x.hl), 0)));
  }
  t1.push(radek('**průměr**', celkemPrac, pct(zakladPrac), '', '', '', '', '', ''));
  const t2 = hlavicka('Persona', 'Partií', 'Tým sabotérů vyhrál', 'Δ proti průměru', 'Vyhoštěn', 'Kazil (kolikrát za partii)');
  const radky2 = PERSONY.map((p) => {
    const x = pp.get(p.klic)!.sab;
    return { p, x, d: x.vyhral / Math.max(1, x.hrano) - zakladSab };
  }).sort((a, b) => b.d - a.d);
  for (const { p, x, d } of radky2) {
    t2.push(radek(`${p.jmeno} (${p.prezdivka})`, x.hrano, pct(x.vyhral / Math.max(1, x.hrano)), `${d >= 0 ? '+' : ''}${(d * 100).toFixed(1)} b.`, pct(x.vyhosten / Math.max(1, x.hrano), 0), num(x.kazil / Math.max(1, x.hrano), 2)));
  }
  t2.push(radek('**průměr**', celkemSab, pct(zakladSab), '', '', ''));
  ulozit('persony.md', ['### Jako pracant', '', ...t1, '', '### Jako sabotér', '', ...t2]);
}

function dvojice() {
  const n = 8;
  const hrano = Math.max(120, Math.floor(HER / 4));
  const R = rng(SEED * 977);
  const vysl: { a: string; b: string; w: Agg }[] = [];
  for (let i = 0; i < PERSONY.length; i++) {
    for (let j = i + 1; j < PERSONY.length; j++) {
      const a = PERSONY[i]!, b = PERSONY[j]!;
      const agg = new Agg();
      for (let g = 0; g < hrano; g++) {
        const zbytek = nahodnyStul(MIX, n - 2, R, [a.klic, b.klic]);
        const osoby = zamichej([a, b, ...zbytek.osoby], R);
        const sedA = osoby.indexOf(a), sedB = osoby.indexOf(b);
        const saboteri = R() < 0.5 ? [sedA, sedB] : [sedB, sedA];
        agg.pridej(hrajPartii({ osoby, saboteri, seed: SEED * 100003 + i * 6007 + j * 101 + g + 1 }));
      }
      vysl.push({ a: a.jmeno, b: b.jmeno, w: agg });
    }
  }
  vysl.sort((x, y) => x.w.winrate - y.w.winrate);
  const radkyT = (pole: typeof vysl) => pole.map((x) => radek(`${x.a} + ${x.b}`, pct(1 - x.w.winrate, 0), num(x.w.minut, 0), num(x.w.kolPrumer)));
  const out = [`Osm hráčů, dva sabotéři, ${hrano} partií na dvojici, ${vysl.length} dvojic. Zbylá sedadla losovaná z celé party person.`, ''];
  out.push('#### Nejsilnější dvojice sabotérů', '', ...hlavicka('Dvojice', 'Sabotéři vyhrají', 'Minut', 'Kol'), ...radkyT(vysl.slice(0, 8)));
  out.push('', '#### Nejslabší dvojice sabotérů', '', ...hlavicka('Dvojice', 'Sabotéři vyhrají', 'Minut', 'Kol'), ...radkyT(vysl.slice(-8).reverse()));
  const sab = vysl.map((x) => 1 - x.w.winrate);
  const prumer = sab.reduce((a, b) => a + b, 0) / sab.length;
  out.push('', `Průměr přes všechny dvojice: sabotéři vyhrají ${pct(prumer)}, rozptyl od ${pct(Math.min(...sab), 0)} do ${pct(Math.max(...sab), 0)}.`);
  ulozit('dvojice.md', out);
}

function citlivost() {
  interface Varianta { popis: string; knob: Partial<Parametry> }
  const varianty: Varianta[] = [
    { popis: 'výchozí model', knob: {} },
    { popis: 'nikdo nepozná lež (detekce 0)', knob: { detekce: 0 } },
    { popis: 'čtení lidí dvojnásobné (detekce 2)', knob: { detekce: 2 } },
    { popis: 'rozprava nic nemění (přesvědčování 0)', knob: { presvedcovani: 0 } },
    { popis: 'rozprava dvakrát silnější', knob: { presvedcovani: 2 } },
    { popis: 'poloviční šum intuice', knob: { sum: 0.5 } },
    { popis: 'šum o polovinu větší', knob: { sum: 1.5 } },
    { popis: 'sabotéři nelžou (mlčí)', knob: { klam: 0 } },
    { popis: 'sabotéři lžou jen v polovině případů', knob: { klam: 0.5 } },
    { popis: 'pracanti věří tvrzením čtvrtinově', knob: { duvera: 0.25 } },
    { popis: 'pracanti věří tvrzením dvojnásobně', knob: { duvera: 2 } },
    { popis: 'sabotéři hrají hloupě (chytrost 0)', knob: { chytrost: 0 } },
    { popis: 'sabotéři lžou hůř (lhaní 0,5)', knob: { lhani: 0.5 } },
  ];
  const velikosti = [6, 8, 10, 12];
  const out = hlavicka('Úprava modelu', ...velikosti.map((n) => `${n} hráčů`), 'Rozdíl proti výchozímu (průměr)');
  let zakladni: number[] = [];
  for (const v of varianty) {
    const w = velikosti.map((n) => behScenare(MIX, n, HER, SEED + 7, { knob: v.knob }).winrate);
    if (!zakladni.length) zakladni = w;
    const rozdil = w.reduce((a, x, i) => a + (x - zakladni[i]!), 0) / w.length;
    out.push(radek(v.popis, ...w.map((x) => pct(x, 0)), v === varianty[0] ? '' : `${rozdil >= 0 ? '+' : ''}${(rozdil * 100).toFixed(0)} b.`));
  }
  ulozit('citlivost.md', out);
}

/** Po každé partii se stůl trochu naučí: dedukci, paměť, čtení lidí i lhaní. */
function poucit(r: Rysy): Rysy {
  const o = { ...r };
  for (const k of ['analytika', 'pamet', 'detekce', 'lhani', 'pravidla', 'koordinace'] as const) o[k] = o[k] + 0.07 * (1 - o[k]);
  o.sum = o.sum * 0.93;
  return o;
}

function vecer() {
  const sc = SCENARE.find((s) => s.klic === 'vecer')!;
  const partii = 5;
  const out = hlavicka('Hráčů', ...Array.from({ length: partii }, (_, i) => `Partie ${i + 1}`), 'Minut (1.)', 'Minut (5.)');
  for (const n of sc.velikosti) {
    const wins = new Array<number>(partii).fill(0);
    const min = new Array<number>(partii).fill(0);
    const veceru = Math.max(60, Math.floor(HER / partii));
    const R = rng(SEED * 313 + n);
    for (let e = 0; e < veceru; e++) {
      const stul = nahodnyStul(sc, n, R);
      let rysy: Rysy[] = stul.osoby.map((p) => ({ ...p.rysy }));
      for (let g = 0; g < partii; g++) {
        const r = hrajPartii({ ...stul, rysy, seed: SEED * 100003 + n * 1009 + e * 17 + g + 1 });
        if (r.vitez === 'pracanti') wins[g]!++;
        min[g]! += r.sekundy / 60;
        rysy = rysy.map(poucit);
      }
    }
    out.push(radek(n, ...wins.map((w) => pct(w / veceru, 0)), num(min[0]! / veceru, 0), num(min[partii - 1]! / veceru, 0)));
  }
  ulozit('vecer.md', out);
}

function nastaveni() {
  const varianty: { popis: string; nast: Partial<Zadani['nastaveni']> }[] = [
    { popis: 'výchozí', nast: {} },
    { popis: 'bez nočních vražd', nast: { vrazdy: false } },
    { popis: 'sabotér bez šeptandy (špionská varianta)', nast: { septandaProSabotery: false } },
    { popis: 'obojí: bez vražd i bez šeptandy pro sabotéry', nast: { vrazdy: false, septandaProSabotery: false } },
  ];
  const out = hlavicka('Nastavení', ...[6, 8, 10, 12].map((n) => `${n} hráčů`), 'Limit padne (8)', 'Minut (8)');
  for (const v of varianty) {
    const w: number[] = [];
    let a8: Agg | null = null;
    for (const n of [6, 8, 10, 12]) {
      const a = behScenare(MIX, n, HER, SEED + 11, { nastaveni: v.nast });
      w.push(a.winrate);
      if (n === 8) a8 = a;
    }
    out.push(radek(v.popis, ...w.map((x) => pct(x, 0)), pct(a8!.podil(a8!.konec.limit), 0), num(a8!.minut, 0)));
  }
  ulozit('nastaveni.md', out);
}

/** Co by dala jiná sestava na lidských stolech: počet sabotérů a limit šicht. */
function sestavy() {
  const out = hlavicka('Hráčů', 'Sabotérů', 'Limit', 'Pracanti', '±', 'Limit padne', 'Minut', 'Pozn.');
  for (const n of [6, 7, 8, 9, 10, 11, 12]) {
    const s0 = SABOTERI[n]!;
    const l0 = LIMIT[n]!;
    const sabs = [s0 - 1, s0, s0 + 1].filter((s) => s >= 1 && s <= Math.floor((n - 1) / 2));
    for (const s of sabs) {
      for (const l of [l0 - 1, l0, l0 + 1, l0 + 2].filter((x) => x >= 2)) {
        const agg = behScenare(MIX, n, HER, SEED + 3, { sestava: { saboteri: s, limit: l } });
        const pozn = s === s0 && l === l0 ? 'dnes' : '';
        out.push(radek(n, s, l, pct(agg.winrate), pct(agg.ci, 1), pct(agg.podil(agg.konec.limit), 0), num(agg.minut, 0), pozn));
      }
    }
  }
  ulozit('sestavy.md', out);
}

/** Dovednost: kdo vyhrává, když proti sobě stojí zkušení a nezkušení? */
function dovednost() {
  const zkuseni = PERSONY.filter((p) => ['marek', 'pavel', 'filip', 'sarka', 'tomas', 'martin'].includes(p.klic));
  const novacci = PERSONY.filter((p) => ['lenka', 'hanka', 'eliska', 'bozena', 'tereza', 'vojta'].includes(p.klic));
  const n = 8;
  const hrano = Math.max(500, HER);
  const R = rng(SEED * 4242);
  const vyber = (pool: Persona[]) => pool[Math.floor(R() * pool.length)]!;
  const bunky: Record<string, Agg> = {};
  for (const sab of ['zkušení', 'nezkušení'] as const) {
    for (const prac of ['zkušení', 'nezkušení'] as const) {
      const agg = new Agg();
      for (let g = 0; g < hrano; g++) {
        const osoby: Persona[] = [];
        for (let i = 0; i < n; i++) osoby.push(vyber(i < 2 ? (sab === 'zkušení' ? zkuseni : novacci) : (prac === 'zkušení' ? zkuseni : novacci)));
        const poradi = zamichej(osoby.map((_, i) => i), R);
        const saboteri = poradi.filter((i) => i < 2 ? true : false).length ? [0, 1] : [0, 1];
        agg.pridej(hrajPartii({ osoby, saboteri, seed: SEED * 100003 + g * 7 + (sab === 'zkušení' ? 1 : 2) * 13 + (prac === 'zkušení' ? 1 : 2) * 101 }));
      }
      bunky[`${sab}/${prac}`] = agg;
    }
  }
  const out = hlavicka('Sabotéři \ Pracanti', 'zkušení pracanti', 'nezkušení pracanti');
  for (const sab of ['zkušení', 'nezkušení']) {
    out.push(radek(`${sab} sabotéři`, pct(1 - bunky[`${sab}/zkušení`]!.winrate, 0) + ' výhra sabotérů', pct(1 - bunky[`${sab}/nezkušení`]!.winrate, 0) + ' výhra sabotérů'));
  }
  // jeden zkušený pracant mezi nezkušenými
  const jeden = new Agg();
  const bez = new Agg();
  for (let g = 0; g < hrano; g++) {
    const sabs = [vyber(novacci), vyber(novacci)];
    const osoby = [...sabs, ...Array.from({ length: 6 }, () => vyber(novacci))];
    bez.pridej(hrajPartii({ osoby, saboteri: [0, 1], seed: SEED * 100003 + g * 11 + 5 }));
    const os2 = osoby.slice(); os2[2] = vyber(zkuseni);
    jeden.pridej(hrajPartii({ osoby: os2, saboteri: [0, 1], seed: SEED * 100003 + g * 11 + 5 }));
  }
  out.push('', `Samí nezkušení: pracanti ${pct(bez.winrate, 0)}. Jeden zkušený pracant mezi nimi: ${pct(jeden.winrate, 0)}.`);
  ulozit('dovednost.md', out);
}

/** Délka rozpravy jako páka, samotná i v kombinaci s limitem. */
function rozprava() {
  const out = hlavicka('Hráčů', 'Limit', ...[0.5, 0.75, 1, 1.5, 2].map((d) => `rozprava ×${d}`));
  for (const [n, l] of [[7, 3], [7, 4], [8, 3], [8, 4], [10, 5], [12, 7]] as [number, number][]) {
    const bunky = [0.5, 0.75, 1, 1.5, 2].map((d) => {
      const a = behScenare(MIX, n, HER, SEED + 9, { sestava: { limit: l }, knob: { rozprava: d } });
      return `${pct(a.winrate, 0)} (${num(a.minut, 0)} min)`;
    });
    out.push(radek(n, l, ...bunky));
  }
  ulozit('rozprava.md', out);
}

/**
 * Mřížka limit × délka rozpravy pro jednu úroveň stolu, všechny velikosti. Výstup je tabulka
 * a JSON, ze kterého se píše `rules.ts`.
 *   npx vite-node docs/persony/spust.ts uroven --uroven smiseny --games 1200
 */
function uroven() {
  const iu = argv.indexOf('--uroven');
  const klic = iu >= 0 ? argv[iu + 1]! : 'smiseny';
  const sc = UROVNE.find((u) => u.klic === klic);
  if (!sc) { console.error('Neznámá úroveň'); process.exit(1); }
  const out = hlavicka('Hráčů', 'Sab.', 'Limit', 'Rozprava', 'Pracanti', '±', 'Minut', 'Limit padne');
  const json: { n: number; sab: number; limit: number; rozprava: number; win: number; minut: number; limitPadne: number }[] = [];
  for (const n of VELIKOSTI) {
    const l0 = LIMIT[n]!;
    for (const l of [l0 - 1, l0, l0 + 1, l0 + 2, l0 + 3].filter((x) => x >= 2)) {
      for (const r of [0.75, 1, 1.5, 2]) {
        const a = behScenare(sc, n, HER, SEED + 21, { sestava: { limit: l }, knob: { rozprava: r } });
        out.push(radek(n, SABOTERI[n]!, l, `×${r}`, pct(a.winrate), pct(a.ci, 1), num(a.minut, 0), pct(a.podil(a.konec.limit), 0)));
        json.push({ n, sab: SABOTERI[n]!, limit: l, rozprava: r, win: a.winrate, minut: a.minut, limitPadne: a.podil(a.konec.limit) });
      }
    }
  }
  writeFileSync(`${VYSTUP}uroven-${klic}.json`, JSON.stringify(json), 'utf8');
  ulozit(`uroven-${klic}.md`, out);
}

/**
 * Odhady pro `ODHAD` v rules.ts: doporučená sestava a posun limitu -1 až +2 na stole dané úrovně.
 *   npx vite-node docs/persony/spust.ts odhad --uroven smiseny --games 3000
 */
function odhad() {
  const iu = argv.indexOf('--uroven');
  const klic = (iu >= 0 ? argv[iu + 1]! : 'smiseny') as Uroven;
  const sc = UROVNE.find((u) => u.klic === klic)!;
  const out = hlavicka('Hráčů', 'Limit', 'Rozprava', 'Posun', 'Pracanti', '±', 'Minut', 'Limit padne');
  const data: Record<number, Record<number, [number, number]>> = {};
  for (const n of VELIKOSTI) {
    data[n] = {};
    for (const posun of [-1, 0, 1, 2]) {
      const s = sestavaPro(n, klic, posun);
      const a = behScenare(sc, n, HER, SEED + 33, { sestava: { limit: s.limitSicht }, knob: { rozprava: s.rozprava } });
      data[n]![posun] = [Math.round(a.winrate * 100) / 100, Math.round(a.minut)];
      out.push(radek(n, s.limitSicht, `×${s.rozprava}`, posun >= 0 ? `+${posun}` : posun, pct(a.winrate), pct(a.ci, 1), num(a.minut, 0), pct(a.podil(a.konec.limit), 0)));
    }
  }
  writeFileSync(`${VYSTUP}odhad-${klic}.json`, JSON.stringify(data), 'utf8');
  ulozit(`odhad-${klic}.md`, out);
}

const pokusy: Record<string, () => void> = { odhad, uroven, kalibrace, zaklad, scenare, persony, dvojice, citlivost, vecer, nastaveni, sestavy, dovednost, rozprava };
const fn = pokusy[pokus];
if (!fn) { console.error(`Neznámý pokus ${pokus}. Možnosti: ${Object.keys(pokusy).join(', ')}`); process.exit(1); }
const t0 = Date.now();
fn();
console.log(`Hotovo za ${((Date.now() - t0) / 1000).toFixed(0)} s.`);
