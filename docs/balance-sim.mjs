#!/usr/bin/env node
/**
 * Šichta — simulátor vyvážení
 *
 * Testuje KOSTRU hry, ne hru. Bot-pracant dělá přesnou bayesovskou inferenci
 * nad všemi možnými množinami sabotérů, takže jeho úspěšnost je STROP mechanické
 * dedukce — co nevyřeší on, nevyřeší ani reálný stůl. Lidé mají navrch čtení
 * chování a blafování, což se simulovat nedá.
 *
 * Spuštění:  node sichta-sim.mjs
 *            node sichta-sim.mjs --games 20000
 */

const argv = process.argv.slice(2);
const argOf = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? Number(argv[i + 1]) : dflt;
};
const GAMES = argOf('games', 10000);

// ---------------------------------------------------------------- náhoda

let seed = 0x2f6e2b1;
function rnd() {
  seed ^= seed << 13; seed >>>= 0;
  seed ^= seed >> 17;
  seed ^= seed << 5;  seed >>>= 0;
  return seed / 0x100000000;
}
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
function sample(arr, k) {
  const c = arr.slice();
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c.slice(0, k);
}

// ---------------------------------------------------------------- kombinatorika

function combinations(items, k) {
  const out = [];
  const rec = (start, acc) => {
    if (acc.length === k) { out.push(acc.slice()); return; }
    for (let i = start; i < items.length; i++) { acc.push(items[i]); rec(i + 1, acc); acc.pop(); }
  };
  rec(0, []);
  return out;
}
const binom = (n, k) => {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1);
  return r;
};

// ---------------------------------------------------------------- politiky sabotérů

// q(k) = pravděpodobnost, že KONKRÉTNÍ sabotér kazí, když je jich v partě k.
const POLICIES = {
  // kazí vždycky — hloupé, rychle se prozradí
  agresivni: (k) => 1,
  // při jednom kazí skoro vždy; při více se dělí, aby nekazili oba (vězňovo dilema)
  vyvazena: (k) => (k <= 1 ? 0.85 : 1 / k),
  // opatrní — často nechají šichtu projít, aby se neprozradili
  opatrna: (k) => (k <= 1 ? 0.6 : 1 / (k + 1)),
};

// ---------------------------------------------------------------- jedna partie

function simulateGame(cfg) {
  const { n, saboteurCount: S, shiftLimit, showSabotageCount, parityRule, whispers, policy } = cfg;
  const killCooldown = cfg.killCooldown ?? 0;   // 0 = vraždit lze po každé padlé šichtě
  const killChance = cfg.killChance ?? 1;       // podíl padlých šicht, po kterých Předák zvolí vraždu
  const requireMajority = cfg.requireMajority ?? false;  // vyhoštění vyžaduje > polovinu živých
  const shiftsPerRound = cfg.shiftsPerRound ?? 1;        // 2 = dopolední + odpolední směna
  const morningEagerness = cfg.morningEagerness ?? 0.5;  // jak moc sabotéři kazí ranní šichtu
  let lastKillRound = -99;
  const q = POLICIES[policy];

  const all = Array.from({ length: n }, (_, i) => i);
  const saboteurs = new Set(sample(all, S));
  const isSab = (p) => saboteurs.has(p);

  const alive = new Set(all);
  const ghostVote = new Map(all.map((p) => [p, false])); // true = už utracený
  const dead = new Set();

  // hypotézy: všechny možné S-prvkové množiny
  let hyps = combinations(all, S).map((set) => ({ set: new Set(set), w: 1 }));

  const constrain = (fn) => {
    for (const h of hyps) if (h.w > 0 && !fn(h.set)) h.w = 0;
    if (hyps.every((h) => h.w === 0)) for (const h of hyps) h.w = 1; // pojistka
  };

  // marginální podezření na hráče, volitelně s vyloučením "já vím, že jsem pracant"
  function marginals(selfKnownFaithful) {
    const tot = new Map(all.map((p) => [p, 0]));
    let sum = 0;
    for (const h of hyps) {
      if (h.w <= 0) continue;
      if (selfKnownFaithful != null && h.set.has(selfKnownFaithful)) continue;
      sum += h.w;
      for (const p of h.set) tot.set(p, tot.get(p) + h.w);
    }
    if (sum === 0) return new Map(all.map((p) => [p, 0]));
    for (const p of all) tot.set(p, tot.get(p) / sum);
    return tot;
  }

  let round = 0;
  let end = null;

  const checkEnd = () => {
    const aliveSab = [...alive].filter(isSab).length;
    const aliveFai = alive.size - aliveSab;
    if (aliveSab === 0) return 'pracanti_vyhostili_vsechny';
    if (aliveFai === 0) return 'sabotéři_vybili_stul';
    if (parityRule && aliveSab >= aliveFai) return 'sabotéři_parita';
    return null;
  };

  while (round < shiftLimit) {
    round++;
    if ((end = checkEnd())) break;

    const aliveArr = [...alive];

    // ---- 1.+2. šichty (1 = jen odpolední, 2 = dopolední + odpolední)
    // Dopolední padlá šichta dá jen výhodu, odpolední odemyká vraždu.
    let teamSet = null, k = 0, failed = false, anyPassed = false;
    for (let sh = 0; sh < shiftsPerRound; sh++) {
      const teamSize = cfg.teamBonus
        ? Math.max(1, Math.min(Math.ceil(aliveArr.length / 2) + cfg.teamBonus, aliveArr.length - 1))
        : Math.max(1, Math.min(Math.ceil(aliveArr.length / 2), aliveArr.length - 1));
      const team = sample(aliveArr, teamSize);
      const tSet = new Set(team);
      const isLast = sh === shiftsPerRound - 1;

      // sabotéři na ranní šichtu tlačí míň — odměna je slabší, riziko stejné
      const eager = isLast ? 1 : morningEagerness;
      const sabs = team.filter(isSab);
      const kk = sabs.length;
      let count = 0;
      for (const _ of sabs) if (rnd() < q(kk) * eager) count++;
      const shFailed = count > 0;

      const qEff = (m) => q(m) * eager;
      if (showSabotageCount) {
        constrain((H) => {
          const m = [...H].filter((p) => tSet.has(p)).length;
          if (count > m) return false;                    // nemožné
          return binom(m, count) * Math.pow(qEff(m), count)
               * Math.pow(1 - qEff(m), m - count) > 1e-12;
        });
      } else {
        constrain((H) => {
          const m = [...H].filter((p) => tSet.has(p)).length;
          return shFailed ? m >= 1 : true;
        });
      }

      if (!shFailed) anyPassed = true;
      if (isLast) { teamSet = tSet; k = kk; failed = shFailed; }
    }

    // ---- 4. hlasování v radě (zjednodušeno na prostou většinu)
    const pubM = marginals(null);
    const votes = new Map();
    for (const p of aliveArr) {
      const cands = aliveArr.filter((x) => x !== p);
      if (!cands.length) continue;
      if (isSab(p)) {
        const targets = cands.filter((x) => !isSab(x));   // nikdy neshazuj svého
        if (targets.length) votes.set(p, targets.reduce((a, b) => (pubM.get(a) >= pubM.get(b) ? a : b)));
      } else {
        const m = marginals(p);
        votes.set(p, cands.reduce((a, b) => (m.get(a) >= m.get(b) ? a : b)));
      }
    }

    const tally = new Map();
    for (const t of votes.values()) tally.set(t, (tally.get(t) || 0) + 1);

    // hlasy Stínů — utrácejí se, jen když můžou rozhodnout těsné hlasování
    const ranked = [...tally.entries()].sort((a, b) => b[1] - a[1]);
    const close = ranked.length >= 2 ? ranked[0][1] - ranked[1][1] <= 1 : ranked.length === 1;
    const lateGame = round >= shiftLimit - 1;
    if (close || lateGame) {
      for (const g of dead) {
        if (ghostVote.get(g)) continue;
        const cands = aliveArr.filter((x) => x !== g);
        if (!cands.length) continue;
        let target;
        if (isSab(g)) {
          const t = cands.filter((x) => !isSab(x));
          if (!t.length) continue;
          target = t.reduce((a, b) => (pubM.get(a) >= pubM.get(b) ? a : b));
        } else {
          const m = marginals(g);
          target = cands.reduce((a, b) => (m.get(a) >= m.get(b) ? a : b));
        }
        ghostVote.set(g, true);
        votes.set(`g${g}`, target);
        tally.set(target, (tally.get(target) || 0) + 1);
      }
    }

    // ---- 5. vyhoštění
    const final = [...tally.entries()].sort((a, b) => b[1] - a[1]);
    let banished = null;
    if (final.length && (final.length === 1 || final[0][1] > final[1][1])) {
      const threshold = requireMajority ? Math.floor(aliveArr.length / 2) + 1 : 1;
      if (final[0][1] >= threshold) banished = final[0][0];
    }

    if (banished != null) {
      alive.delete(banished); dead.add(banished);
      const wasSab = isSab(banished);
      constrain((H) => H.has(banished) === wasSab);   // role se veřejně odhalí
    }

    // ---- 6. šeptanda (jen při úspěšné šichtě)
    //
    // Od přepisu na individuální šeptandu dostává větu KAŽDÝ živý hráč, ne
    // stůl jednu společnou. Bot je strop, ne odhad, takže se modeluje
    // nejhorší možný případ pro sabotéry: pracanti si své věty poctivě
    // vymění a sabotérské lži bezchybně zahodí. Skutečný stůl tohle nikdy
    // nedokáže, takže reálná úspěšnost pracantů bude nižší než tady.
    if (whispers && anyPassed) {
      const alivePrac = [...alive].filter((p) => !isSab(p));
      const aliveSabs = [...alive].filter(isSab);

      const kolik = cfg.whisperFacts ?? alivePrac.length;
      for (let w = 0; w < Math.min(kolik, alivePrac.length); w++) {
        const options = [];

        // dvojice, ve které je aspoň jeden pracant (váha 4 v septanda.ts)
        if (alivePrac.length >= 1 && alive.size >= 2) {
          const jisty = pick(alivePrac);
          const druhy = pick([...alive].filter((p) => p !== jisty));
          if (druhy != null) options.push(((a, b) => (H) => !(H.has(a) && H.has(b)))(jisty, druhy));
        }
        // trojice, ve které je aspoň jeden sabotér (váha 4)
        if (aliveSabs.length && alive.size >= 3) {
          const jisty = pick(aliveSabs);
          const zbytek = sample([...alive].filter((p) => p !== jisty), 2);
          const trojice = [jisty, ...zbytek];
          options.push(((t) => (H) => t.some((p) => H.has(p)))(trojice));
        }
        // jeden jistý pracant (váha 1, nejsilnější a proto nejvzácnější)
        if (alivePrac.length && Math.random() < 1 / 12) {
          options.push(((a) => (H) => !H.has(a))(pick(alivePrac)));
        }

        if (options.length) constrain(pick(options));
      }
    }


    if ((end = checkEnd())) break;

    // ---- 7. noc (vražda jen po padlé šichtě)
    if (failed && round - lastKillRound > killCooldown && rnd() < killChance) {
      const targets = [...alive].filter((p) => !isSab(p));
      if (targets.length) {
        lastKillRound = round;
        const m = marginals(null);
        // zabij toho, komu stůl nejvíc věří — je nejnebezpečnější
        const victim = targets.reduce((a, b) => (m.get(a) <= m.get(b) ? a : b));
        alive.delete(victim); dead.add(victim);
        constrain((H) => !H.has(victim));   // zavražděný je vždy pracant
      }
    }
    if ((end = checkEnd())) break;
  }

  if (!end) end = 'sabotéři_vyprsel_limit';
  return {
    end,
    rounds: round,
    faithfulWin: end === 'pracanti_vyhostili_vsechny',
    aliveAtEnd: alive.size,
  };
}

// ---------------------------------------------------------------- běh

function run(cfg, games = GAMES) {
  let wins = 0, rounds = 0, aliveSum = 0;
  const ends = {};
  for (let i = 0; i < games; i++) {
    const r = simulateGame(cfg);
    if (r.faithfulWin) wins++;
    rounds += r.rounds;
    aliveSum += r.aliveAtEnd;
    ends[r.end] = (ends[r.end] || 0) + 1;
  }
  return {
    winRate: wins / games,
    avgRounds: rounds / games,
    avgAlive: aliveSum / games,
    ends: Object.fromEntries(Object.entries(ends).map(([k, v]) => [k, v / games])),
  };
}

const defaultSabs = (n) => (n <= 6 ? 1 : n <= 9 ? 2 : 3);
const defaultLimit = (n) => (n <= 6 ? 4 : n <= 9 ? 5 : 6);
const base = {
  showSabotageCount: true, parityRule: false, whispers: true, policy: 'vyvazena',
};
const pct = (x) => `${(x * 100).toFixed(1).padStart(5)}%`;

function table(title, rows) {
  console.log(`\n\x1b[1m${title}\x1b[0m`);
  console.log('─'.repeat(78));
  for (const [label, r] of rows) {
    console.log(
      `${label.padEnd(30)} pracanti ${pct(r.winRate)}   kol ${r.avgRounds.toFixed(1).padStart(4)}   živých na konci ${r.avgAlive.toFixed(1).padStart(4)}`
    );
  }
}

console.log(`\nŠichta — simulace vyvážení   (${GAMES.toLocaleString('cs')} partií na konfiguraci)`);
console.log('Bot-pracant = přesná bayesovská inference. Jeho výhra je STROP mechanické dedukce.');

// 1) základní nastavení podle počtu hráčů
table('1. Výchozí nastavení z designu', [6, 8, 10, 12].map((n) => [
  `${n} hráčů, ${defaultSabs(n)} sab., limit ${defaultLimit(n)}`,
  run({ ...base, n, saboteurCount: defaultSabs(n), shiftLimit: defaultLimit(n) }),
]));

// 2) limit šicht
for (const n of [8, 12]) {
  table(`2. Limit šicht — ${n} hráčů, ${defaultSabs(n)} sabotéři`, [3, 4, 5, 6, 7, 8].map((L) => [
    `limit ${L}`,
    run({ ...base, n, saboteurCount: defaultSabs(n), shiftLimit: L }),
  ]));
}

// 3) parita
table('3. Pravidlo parity (8 hráčů, 2 sab., limit 5)', [
  ['bez parity (návrh)', run({ ...base, n: 8, saboteurCount: 2, shiftLimit: 5, parityRule: false })],
  ['s paritou (původní)', run({ ...base, n: 8, saboteurCount: 2, shiftLimit: 5, parityRule: true })],
]);

// 4) ukazovat počet sabotáží
table('4. Ukazovat počet sabotáží (8 hráčů, 2 sab., limit 5)', [
  ['ukazovat (nový návrh)', run({ ...base, n: 8, saboteurCount: 2, shiftLimit: 5, showSabotageCount: true })],
  ['jen prošlo/padlo', run({ ...base, n: 8, saboteurCount: 2, shiftLimit: 5, showSabotageCount: false })],
]);

// 5) šeptanda
table('5. Šeptanda (8 hráčů, 2 sab., limit 5)', [
  ['se šeptandou', run({ ...base, n: 8, saboteurCount: 2, shiftLimit: 5, whispers: true })],
  ['bez šeptandy', run({ ...base, n: 8, saboteurCount: 2, shiftLimit: 5, whispers: false })],
]);

// 6) chytrost sabotérů
table('6. Politika sabotérů (8 hráčů, 2 sab., limit 5)',
  Object.keys(POLICIES).map((p) => [
    p, run({ ...base, n: 8, saboteurCount: 2, shiftLimit: 5, policy: p }),
  ]));

// 7) počet sabotérů
table('7. Počet sabotérů (8 hráčů, limit 5)', [1, 2, 3].map((S) => [
  `${S} sabotér(ů)`, run({ ...base, n: 8, saboteurCount: S, shiftLimit: 5 }),
]));

// 8) jak končí hra
console.log('\n\x1b[1m8. Rozložení konců (8 hráčů, 2 sab., limit 5)\x1b[0m');
console.log('─'.repeat(78));
const e = run({ ...base, n: 8, saboteurCount: 2, shiftLimit: 5 }).ends;
for (const [k, v] of Object.entries(e).sort((a, b) => b[1] - a[1])) {
  console.log(`${k.padEnd(34)} ${pct(v)}`);
}

// 9) poměr sabotérů — hledáme pásmo, kde bot-pracant vyhrává kolem 35–45 %
console.log('\n\x1b[1m9. Poměr sabotérů (limit 6, cíl: pracanti 35–45 %)\x1b[0m');
console.log('─'.repeat(78));
for (const n of [6, 7, 8, 9, 10, 12]) {
  const line = [];
  for (let S = 1; S <= Math.min(4, Math.floor(n / 2) - 1); S++) {
    const r = run({ ...base, n, saboteurCount: S, shiftLimit: 6 }, Math.floor(GAMES / 2));
    const mark = r.winRate >= 0.35 && r.winRate <= 0.45 ? '*' : ' ';
    line.push(`${S}sab ${pct(r.winRate)}${mark}`);
  }
  console.log(`${String(n).padStart(2)} hráčů   ${line.join('   ')}`);
}

// 10) zpomalení úbytku: vraždit smí sabotéři jen každou druhou noc
console.log('\n\x1b[1m10. Cooldown vražd (vraždit lze jen každé druhé kolo)\x1b[0m');
console.log('─'.repeat(78));
for (const [n, S] of [[8, 3], [10, 3], [12, 4]]) {
  for (const cd of [0, 1]) {
    const r = run({ ...base, n, saboteurCount: S, shiftLimit: 6, killCooldown: cd });
    const limitEnd = r.ends['sabotéři_vyprsel_limit'] || 0;
    console.log(
      `${n}hr/${S}sab  cooldown ${cd}   pracanti ${pct(r.winRate)}   kol ${r.avgRounds.toFixed(1)}   ` +
      `živých ${r.avgAlive.toFixed(1)}   dojde na limit ${pct(limitEnd)}`
    );
  }
}

// 12) alternativy ke cooldownu
console.log('\n\x1b[1m12. Čím zpomalit úbytek — alternativy ke cooldownu\x1b[0m');
console.log('─'.repeat(78));
for (const [n, S, L] of [[8, 3, 6], [10, 3, 6], [12, 4, 7]]) {
  const variants = [
    ['nic (vražda po každé padlé)', { }],
    ['cooldown 1 kolo', { killCooldown: 1 }],
    ['nabídka odměn ~60 % vražd', { killChance: 0.6 }],
    ['nabídka odměn ~50 % vražd', { killChance: 0.5 }],
    ['rada vyžaduje většinu', { requireMajority: true }],
    ['většina + odměny 60 %', { requireMajority: true, killChance: 0.6 }],
  ];
  console.log(`\n  ${n} hráčů / ${S} sab / limit ${L}`);
  for (const [label, extra] of variants) {
    const r = run({ ...base, n, saboteurCount: S, shiftLimit: L, ...extra });
    const lim = r.ends['sabotéři_vyprsel_limit'] || 0;
    const ok = r.winRate >= 0.35 && r.winRate <= 0.60 ? '\x1b[32m✓\x1b[0m' : ' ';
    console.log(
      `  ${label.padEnd(30)} pracanti ${pct(r.winRate)} ${ok}  kol ${r.avgRounds.toFixed(1)}  ` +
      `živých ${r.avgAlive.toFixed(1)}  limit ${pct(lim)}`
    );
  }
}
console.log();

// 11) kandidát na finální nastavení: cooldown 1, hustší sabotéři
console.log('\n\x1b[1m11. Kandidát na finální nastavení (cooldown 1)\x1b[0m');
console.log('─'.repeat(78));
console.log('bezpečné pásmo pro bota: 35–60 %  (pod 25 % nebo nad 80 % = rozbité)\n');
for (const [n, S, L] of [
  [6, 2, 5], [7, 2, 5], [7, 3, 5], [8, 3, 6], [9, 3, 6],
  [10, 3, 6], [10, 4, 6], [11, 4, 7], [12, 4, 7], [12, 5, 7],
]) {
  const r = run({ ...base, n, saboteurCount: S, shiftLimit: L, killCooldown: 1 });
  const ok = r.winRate >= 0.35 && r.winRate <= 0.60 ? '\x1b[32m ✓\x1b[0m' : '  ';
  console.log(
    `${String(n).padStart(2)} hráčů / ${S} sab / limit ${L}   pracanti ${pct(r.winRate)}${ok}   ` +
    `kol ${r.avgRounds.toFixed(1)}   živých na konci ${r.avgAlive.toFixed(1)}`
  );
}
console.log();

// 13) MALY STUL — co vubec funguje pri 4–9 hracich
console.log('');
console.log('13. Maly stul: co funguje pri 4-9 hracich');
console.log('-'.repeat(78));
console.log('pasmo 35-60 % = pouzitelne. Grid: saboteri x limit x septanda x smeny');
console.log('');
for (const n of [4, 5, 6, 7, 8, 9]) {
  const found = [];
  for (const S of [1, 2, 3]) {
    if (S >= n - 2) continue;
    for (const L of [3, 4, 5, 6]) {
      for (const w of [true, false]) {
        for (const sh of [1, 2]) {
          const r = run({ ...base, n, saboteurCount: S, shiftLimit: L, whispers: w,
                          shiftsPerRound: sh, killChance: 0.6 }, Math.floor(GAMES / 3));
          if (r.winRate >= 0.35 && r.winRate <= 0.60) found.push({ S, L, w, sh, r });
        }
      }
    }
  }
  found.sort((a, b) => Math.abs(a.r.winRate - 0.47) - Math.abs(b.r.winRate - 0.47));
  if (!found.length) { console.log(`${n} hracu  — ZADNA konfigurace v pasmu`); continue; }
  console.log(`${n} hracu`);
  for (const f of found.slice(0, 3)) {
    console.log(
      `   ${f.S} sab · limit ${f.L} · septanda ${f.w ? 'ano' : 'NE '} · ${f.sh} smeny` +
      `   -> pracanti ${pct(f.r.winRate)}   kol ${f.r.avgRounds.toFixed(1)}   zivych ${f.r.avgAlive.toFixed(1)}`
    );
  }
}

// 14) cisty efekt dvou smen
console.log('');
console.log('14. Efekt dvou smen (dopoledni jen vyhoda, odpoledni vrazda)');
console.log('-'.repeat(78));
for (const [n, S, L] of [[6, 2, 5], [7, 2, 5], [8, 3, 6], [9, 3, 6]]) {
  const a = run({ ...base, n, saboteurCount: S, shiftLimit: L, killChance: 0.6, shiftsPerRound: 1 });
  const b = run({ ...base, n, saboteurCount: S, shiftLimit: L, killChance: 0.6, shiftsPerRound: 2 });
  console.log(
    `${n}hr/${S}sab/limit ${L}   1 smena ${pct(a.winRate)} (kol ${a.avgRounds.toFixed(1)})   ` +
    `2 smeny ${pct(b.winRate)} (kol ${b.avgRounds.toFixed(1)})   rozdil ${((b.winRate - a.winRate) * 100).toFixed(1).padStart(5)} b.`
  );
}
console.log('');

// 15) skalovani nad 12 hracu: kde to prestane fungovat
if (process.argv.includes('--scale')) {
  console.log('');
  console.log('15. Skalovani nad 12 hracu (cooldown/odmeny 0.6, 2 smeny)');
  console.log('-'.repeat(78));
  for (const [n, S, L] of [[12,4,7],[14,5,7],[16,5,8],[16,6,8],[18,6,8],[20,7,9]]) {
    const games = n >= 18 ? 150 : n >= 16 ? 300 : 600;
    const t0 = Date.now();
    const r = run({ ...base, n, saboteurCount: S, shiftLimit: L, killChance: 0.6, shiftsPerRound: 2 }, games);
    const teamSize = Math.min(Math.ceil(n/2), n-1);
    const ok = r.winRate >= 0.35 && r.winRate <= 0.60 ? 'OK' : '  ';
    console.log(
      `${String(n).padStart(2)}hr/${S}sab/limit ${L}  parta ${teamSize}  pracanti ${pct(r.winRate)} ${ok}  ` +
      `kol ${r.avgRounds.toFixed(1)}  zivych ${r.avgAlive.toFixed(1)}  (${games} her, ${((Date.now()-t0)/1000).toFixed(0)}s)`
    );
  }
  console.log('');
}
