/**
 * Blood on the Clocktower (Trouble Brewing) se stejnými personami jako Šichta.
 *
 *   npx vite-node docs/persony/spust-krvavka.ts <pokus> [--games N] [--seed N]
 *
 * Pokusy: zaklad, scenare, persony, dovednost, rozprava, citlivost, vecer
 * Výsledky do `docs/persony/vysledky/krvavka-<pokus>.md`.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { hrajKrvavku, pocetSabotuKrvavka, type ParametryK, type VysledekK, type ZadaniK } from './krvavka';
import { PERSONY, SCENARE, type Persona, type Rysy, type Scenar } from './persony';
import { rng } from '../../src/game/random';

const argv = process.argv.slice(2);
const pokus = argv[0] ?? 'zaklad';
const argOf = (jmeno: string, vychozi: number) => {
  const i = argv.indexOf(`--${jmeno}`);
  return i >= 0 && argv[i + 1] ? Number(argv[i + 1]) : vychozi;
};
const HER = argOf('games', 1500);
const SEED = argOf('seed', 1);
const VYSTUP = fileURLToPath(new URL('./vysledky/', import.meta.url));
mkdirSync(VYSTUP, { recursive: true });

const pct = (x: number, d = 1) => `${(x * 100).toFixed(d)} %`;
const num = (x: number, d = 1) => x.toFixed(d);
const radek = (...b: (string | number)[]) => `| ${b.join(' | ')} |`;
const hlavicka = (...s: string[]) => [radek(...s), radek(...s.map(() => '---'))];
function ulozit(jmeno: string, radky: string[]) {
  console.log(radky.join('\n'));
  writeFileSync(`${VYSTUP}krvavka-${jmeno}`, radky.join('\n') + '\n', 'utf8');
}

class Agg {
  partii = 0;
  dobri = 0;
  dni = 0;
  sekundy = 0;
  demonPopraven = 0;
  zbylyDva = 0;
  svaty = 0;
  starosta = 0;
  jine = 0;
  popDob = 0;
  popZl = 0;
  vrazd = 0;
  bezPopravy = 0;
  pridej(r: VysledekK) {
    this.partii++;
    if (r.vitez === 'dobri') this.dobri++;
    this.dni += r.dni;
    this.sekundy += r.sekundy;
    if (r.duvod.startsWith('Démon')) this.demonPopraven++;
    else if (r.duvod.startsWith('Zbyli')) this.zbylyDva++;
    else if (r.duvod.startsWith('Popraven Svatý')) this.svaty++;
    else if (r.duvod.startsWith('Starosta')) this.starosta++;
    else this.jine++;
    this.popDob += r.popravenoDobrych;
    this.popZl += r.popravenoZlych;
    this.vrazd += r.nocnichVrazd;
    this.bezPopravy += r.dnuBezPopravy;
  }
  get win() { return this.dobri / Math.max(1, this.partii); }
  get ci() { return 1.96 * Math.sqrt((this.win * (1 - this.win)) / Math.max(1, this.partii)); }
  get minut() { return this.sekundy / Math.max(1, this.partii) / 60; }
  get dniPrum() { return this.dni / Math.max(1, this.partii); }
  p(x: number) { return x / Math.max(1, this.partii); }
}

const zamichej = <T,>(a: T[], R: () => number): T[] => {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!]; }
  return a;
};

function nahodnyStul(sc: Scenar, n: number, R: () => number, vynechat: string[] = []) {
  const jeVahy = Object.keys(sc.vahy).length > 0;
  const vsechny = jeVahy ? PERSONY.filter((p) => (sc.vahy[p.klic] ?? 0) > 0) : PERSONY;
  const pocty = new Map<string, number>();
  const osoby: Persona[] = [];
  while (osoby.length < n) {
    const kand = vsechny.filter((p) => (pocty.get(p.klic) ?? 0) < 2 && !vynechat.includes(p.klic));
    if (!kand.length) break;
    const suma = kand.reduce((a, p) => a + (jeVahy ? sc.vahy[p.klic]! : 1), 0);
    let los = R() * suma;
    let v = kand[kand.length - 1]!;
    for (const p of kand) { los -= jeVahy ? sc.vahy[p.klic]! : 1; if (los <= 0) { v = p; break; } }
    osoby.push(v);
    pocty.set(v.klic, (pocty.get(v.klic) ?? 0) + 1);
  }
  zamichej(osoby, R);
  const sedadla = zamichej(osoby.map((_, i) => i), R);
  const pritele: [number, number][] = [];
  for (let k = 0; k < sc.pary && sedadla.length >= 2; k++) pritele.push([sedadla.pop()!, sedadla.pop()!]);
  return { osoby, pritele };
}

const MIX = SCENARE.find((s) => s.klic === 'mix')!;
const VELIKOSTI = [5, 6, 7, 8, 9, 10, 11, 12];

function beh(sc: Scenar, n: number, her: number, seedBase: number, extra: Partial<ZadaniK> = {}, surove?: VysledekK[]) {
  const agg = new Agg();
  const R = rng(seedBase * 7919 + n * 131 + sc.klic.length);
  for (let g = 0; g < her; g++) {
    const stul = nahodnyStul(sc, n, R);
    const r = hrajKrvavku({ ...stul, uprava: sc.uprava, seed: seedBase * 100003 + n * 1009 + g + 1, ...extra });
    agg.pridej(r);
    surove?.push(r);
  }
  return agg;
}

function zaklad() {
  const t = hlavicka('Hráčů', 'Zlých', 'Dobří vyhrají', '±', 'Démon popraven', 'Zbyli dva', 'Svatý', 'Dní', 'Minut', 'Poprav. dobrých / partii', 'Poprav. zlých / partii', 'Dnů bez popravy');
  for (const n of VELIKOSTI) {
    const a = beh(MIX, n, HER, SEED);
    t.push(radek(n, pocetSabotuKrvavka(n), pct(a.win), pct(a.ci, 1), pct(a.p(a.demonPopraven), 0), pct(a.p(a.zbylyDva), 0), pct(a.p(a.svaty), 0), num(a.dniPrum), num(a.minut, 0), num(a.popDob / a.partii, 2), num(a.popZl / a.partii, 2), num(a.bezPopravy / a.partii, 2)));
  }
  ulozit('zaklad.md', t);
}

function scenare() {
  const out = hlavicka('Stůl', ...VELIKOSTI.map(String));
  for (const sc of SCENARE) {
    if (sc.vecer) continue;
    const bunky = VELIKOSTI.map((n) => (sc.velikosti.includes(n) ? pct(beh(sc, n, HER, SEED).win, 0) : ''));
    out.push(radek(sc.nazev, ...bunky));
  }
  ulozit('scenare.md', out);
}

function persony() {
  const pp = new Map<string, { d: number; dw: number; z: number; zw: number; dPop: number; zPop: number }>(PERSONY.map((p) => [p.klic, { d: 0, dw: 0, z: 0, zw: 0, dPop: 0, zPop: 0 }]));
  let D = 0, DW = 0, Z = 0, ZW = 0;
  for (const n of [6, 7, 8, 9, 10, 11, 12]) {
    const r: VysledekK[] = [];
    beh(MIX, n, HER, SEED + 50, {}, r);
    for (const g of r) for (const h of g.hraci) {
      const x = pp.get(h.persona)!;
      if (h.zly) { x.z++; Z++; if (h.vyhral) { x.zw++; ZW++; } } else { x.d++; D++; if (h.vyhral) { x.dw++; DW++; } if (h.popraven) x.dPop++; }
    }
  }
  const zd = DW / D, zz = ZW / Z;
  const t1 = hlavicka('Persona', 'Partií', 'Dobří vyhráli', 'Δ proti průměru', 'Popraven nevinně');
  for (const [p, x] of [...pp.entries()].map(([k, x]) => [PERSONY.find((q) => q.klic === k)!, x] as const).sort((a, b) => b[1].dw / b[1].d - a[1].dw / a[1].d)) {
    t1.push(radek(`${p.jmeno} (${p.prezdivka})`, x.d, pct(x.dw / x.d), `${(x.dw / x.d - zd >= 0 ? '+' : '')}${((x.dw / x.d - zd) * 100).toFixed(1)} b.`, pct(x.dPop / x.d, 0)));
  }
  t1.push(radek('**průměr**', D, pct(zd), '', ''));
  const t2 = hlavicka('Persona', 'Partií', 'Zlí vyhráli', 'Δ proti průměru');
  for (const [p, x] of [...pp.entries()].map(([k, x]) => [PERSONY.find((q) => q.klic === k)!, x] as const).sort((a, b) => b[1].zw / Math.max(1, b[1].z) - a[1].zw / Math.max(1, a[1].z))) {
    const w = x.zw / Math.max(1, x.z);
    t2.push(radek(`${p.jmeno} (${p.prezdivka})`, x.z, pct(w), `${w - zz >= 0 ? '+' : ''}${((w - zz) * 100).toFixed(1)} b.`));
  }
  t2.push(radek('**průměr**', Z, pct(zz), ''));
  ulozit('persony.md', ['### Jako dobrý', '', ...t1, '', '### Jako zlý', '', ...t2]);
}

function dovednost() {
  const zkuseni = PERSONY.filter((p) => ['marek', 'pavel', 'filip', 'sarka', 'tomas', 'martin'].includes(p.klic));
  const novacci = PERSONY.filter((p) => ['lenka', 'hanka', 'eliska', 'bozena', 'tereza', 'vojta'].includes(p.klic));
  const n = 8;
  const R = rng(SEED * 4242);
  const vyber = (pool: Persona[]) => pool[Math.floor(R() * pool.length)]!;
  const out = hlavicka('Zlí \\ Dobří', 'zkušení dobří', 'nezkušení dobří');
  for (const zli of ['zkušení', 'nezkušení'] as const) {
    const bunky: string[] = [];
    for (const dobri of ['zkušení', 'nezkušení'] as const) {
      const a = new Agg();
      for (let g = 0; g < HER; g++) {
        const osoby: Persona[] = [];
        for (let i = 0; i < n; i++) osoby.push(vyber(i < 2 ? (zli === 'zkušení' ? zkuseni : novacci) : (dobri === 'zkušení' ? zkuseni : novacci)));
        a.pridej(hrajKrvavku({ osoby, zli: [0, 1], seed: SEED * 100003 + g * 7 + (zli === 'zkušení' ? 1 : 2) * 13 + (dobri === 'zkušení' ? 1 : 2) * 101 }));
      }
      bunky.push(`${pct(1 - a.win, 0)} výhra zlých`);
    }
    out.push(radek(`${zli} zlí`, ...bunky));
  }
  const jeden = new Agg();
  const bez = new Agg();
  for (let g = 0; g < HER; g++) {
    const osoby = Array.from({ length: n }, () => vyber(novacci));
    bez.pridej(hrajKrvavku({ osoby, zli: [0, 1], seed: SEED * 100003 + g * 11 + 5 }));
    const o2 = osoby.slice(); o2[2] = vyber(zkuseni);
    jeden.pridej(hrajKrvavku({ osoby: o2, zli: [0, 1], seed: SEED * 100003 + g * 11 + 5 }));
  }
  out.push('', `Samí nezkušení: dobří ${pct(bez.win, 0)}. Jeden zkušený dobrý mezi nimi: ${pct(jeden.win, 0)}.`);
  ulozit('dovednost.md', out);
}

function rozprava() {
  const out = hlavicka('Hráčů', ...[0.5, 0.75, 1, 1.5, 2].map((d) => `rozprava ×${d}`));
  for (const n of [7, 8, 10, 12]) {
    out.push(radek(n, ...[0.5, 0.75, 1, 1.5, 2].map((d) => { const a = beh(MIX, n, HER, SEED + 9, { knob: { rozprava: d } }); return `${pct(a.win, 0)} (${num(a.minut, 0)} min)`; })));
  }
  ulozit('rozprava.md', out);
}

function citlivost() {
  const varianty: { popis: string; knob: Partial<ParametryK> }[] = [
    { popis: 'výchozí model', knob: {} },
    { popis: 'nikdo nepozná lež (detekce 0)', knob: { detekce: 0 } },
    { popis: 'čtení lidí dvojnásobné', knob: { detekce: 2 } },
    { popis: 'rozprava nic nemění', knob: { presvedcovani: 0 } },
    { popis: 'rozprava dvakrát silnější', knob: { presvedcovani: 2 } },
    { popis: 'poloviční šum intuice', knob: { sum: 0.5 } },
    { popis: 'šum o polovinu větší', knob: { sum: 1.5 } },
    { popis: 'zlí nebluffují (mlčí)', knob: { klam: 0 } },
    { popis: 'zlí bluffují v polovině případů', knob: { klam: 0.5 } },
    { popis: 'dobří věří tvrzením čtvrtinově', knob: { duvera: 0.25 } },
    { popis: 'dobří věří tvrzením dvojnásobně', knob: { duvera: 2 } },
    { popis: 'zlí lžou hůř (lhaní 0,5)', knob: { lhani: 0.5 } },
  ];
  const velikosti = [6, 8, 10, 12];
  const out = hlavicka('Úprava modelu', ...velikosti.map((n) => `${n} hráčů`), 'Rozdíl (průměr)');
  let zakladni: number[] = [];
  for (const v of varianty) {
    const w = velikosti.map((n) => beh(MIX, n, HER, SEED + 7, { knob: v.knob }).win);
    if (!zakladni.length) zakladni = w;
    const d = w.reduce((a, x, i) => a + (x - zakladni[i]!), 0) / w.length;
    out.push(radek(v.popis, ...w.map((x) => pct(x, 0)), v === varianty[0] ? '' : `${d >= 0 ? '+' : ''}${(d * 100).toFixed(0)} b.`));
  }
  ulozit('citlivost.md', out);
}

function poucit(r: Rysy): Rysy {
  const o = { ...r };
  for (const k of ['analytika', 'pamet', 'detekce', 'lhani', 'pravidla', 'koordinace'] as const) o[k] = o[k] + 0.07 * (1 - o[k]);
  o.sum = o.sum * 0.93;
  return o;
}

function vecer() {
  const sc = SCENARE.find((s) => s.klic === 'vecer')!;
  const out = hlavicka('Hráčů', 'Partie 1', 'Partie 2', 'Partie 3', 'Partie 4', 'Partie 5');
  for (const n of sc.velikosti) {
    const wins = [0, 0, 0, 0, 0];
    const veceru = Math.max(60, Math.floor(HER / 5));
    const R = rng(SEED * 313 + n);
    for (let e = 0; e < veceru; e++) {
      const stul = nahodnyStul(sc, n, R);
      let rysy: Rysy[] = stul.osoby.map((p) => ({ ...p.rysy }));
      for (let g = 0; g < 5; g++) {
        const r = hrajKrvavku({ ...stul, rysy, seed: SEED * 100003 + n * 1009 + e * 17 + g + 1 });
        if (r.vitez === 'dobri') wins[g]!++;
        rysy = rysy.map(poucit);
      }
    }
    out.push(radek(n, ...wins.map((w) => pct(w / veceru, 0))));
  }
  ulozit('vecer.md', out);
}

const pokusy: Record<string, () => void> = { zaklad, scenare, persony, dovednost, rozprava, citlivost, vecer };
const fn = pokusy[pokus];
if (!fn) { console.error(`Neznámý pokus ${pokus}. Možnosti: ${Object.keys(pokusy).join(', ')}`); process.exit(1); }
const t0 = Date.now();
fn();
console.log(`Hotovo za ${((Date.now() - t0) / 1000).toFixed(0)} s.`);
