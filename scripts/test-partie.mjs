#!/usr/bin/env node
/**
 * Test celých partií proti workeru. Do každé místnosti se připojí tolik
 * botů, kolik je hráčů, a hrají od šatny po konec, tak jako telefony:
 * ťukají MAKAT a KAZIT, nominují, hlasují, předák vybírá odměnu.
 * Místnosti běží současně, takže se ověří i to, že se navzájem nepletou.
 *
 * Boti rozhodují náhodně, ne rozumně. Nejde o to, kdo vyhraje, ale o to, že
 * hra pokaždé doběhne a výsledek je konzistentní: limit šicht odpovídá
 * úrovni a posunu, vítěz odpovídá pravidlům, role se na konci odhalí,
 * všichni vidí totéž a nikdo nedostal chybu.
 *
 * Spuštění (potřebuje Node 22+, partie trvá minuty, fáze mají pevné časy):
 *   node scripts/test-partie.mjs http://localhost:8787
 *   node scripts/test-partie.mjs https://sichta.neco.workers.dev
 *
 * Volitelně `--stoly 5:smiseny:0,8:zacatecnici:1,12:zkuseni:0` (počet hráčů,
 * úroveň, posun limitu).
 */

const ZAKLAD = (process.argv[2] ?? '').replace(/\/$/, '');
if (!ZAKLAD || ZAKLAD.startsWith('--')) {
  console.error('Chybí adresa workeru. Použij: node scripts/test-partie.mjs http://localhost:8787');
  process.exit(1);
}
const iStoly = process.argv.indexOf('--stoly');
const STOLY = (iStoly >= 0 ? process.argv[iStoly + 1] : '5:smiseny:0,8:zacatecnici:1,12:zkuseni:0')
  .split(',').map((x) => { const [n, uroven, posun] = x.split(':'); return { n: Number(n), uroven, posun: Number(posun) }; });

// Doporučené limity z rules.ts (limit šicht podle úrovně a počtu hráčů). Test je kontroluje
// proti tomu, co server vyrobí, takže při změně rules.ts je potřeba je opsat.
const DOPORUCENY = {
  zacatecnici: { 5: 3, 6: 6, 7: 4, 8: 4, 9: 8, 10: 7, 11: 6, 12: 10 },
  smiseny: { 5: 2, 6: 5, 7: 4, 8: 4, 9: 7, 10: 6, 11: 6, 12: 10 },
  zkuseni: { 5: 2, 6: 4, 7: 4, 8: 4, 9: 8, 10: 7, 11: 6, 12: 9 },
};
const SABOTERI = { 5: 1, 6: 2, 7: 2, 8: 2, 9: 3, 10: 3, 11: 3, 12: 4 };

const cekej = (ms) => new Promise((r) => setTimeout(r, ms));
const nahoda = (pole) => pole[Math.floor(Math.random() * pole.length)];
let selhani = 0;
function overit(podminka, popis) {
  if (podminka) console.log(`  ok   ${popis}`);
  else { console.log(`  CHYBA ${popis}`); selhani++; }
}

function bot(kod, jmeno, token) {
  const url = `${ZAKLAD.replace(/^http/, 'ws')}/api/mistnost/${kod}/ws?token=${encodeURIComponent(token)}&jmeno=${encodeURIComponent(jmeno)}`;
  const ws = new WebSocket(url);
  const b = { ws, jmeno, token, pohled: null, chyba: null, zprav: 0, udelal: new Set(), konecResolve: null };
  ws.addEventListener('message', (e) => {
    const d = JSON.parse(e.data);
    if (d.t === 'chyba') b.chyba = d.kod;
    if (d.t !== 'pohled') return;
    b.pohled = d.p;
    b.zprav++;
    try { rozhodni(b); } catch (err) { b.chyba = `bot: ${err.message}`; }
  });
  return new Promise((res, rej) => {
    ws.addEventListener('open', () => res(b));
    ws.addEventListener('error', () => rej(new Error(`nepřipojil se: ${jmeno}`)));
  });
}

const posli = (b, akce) => b.ws.send(JSON.stringify({ t: 'akce', a: akce }));

/** Jednou za kolo a fázi: bot nesmí posílat totéž pořád dokola. */
function jednou(b, klic, fn) {
  const k = `${b.pohled.kolo}|${b.pohled.faze}|${klic}`;
  if (b.udelal.has(k)) return;
  b.udelal.add(k);
  fn();
}

function rozhodni(b) {
  const p = b.pohled;
  const ja = p.ja;
  const mojeHrac = p.hraci.find((h) => h.id === ja.id);
  const zivi = p.hraci.filter((h) => h.zivy);
  const ostatniZivi = zivi.filter((h) => h.id !== ja.id);

  switch (p.faze) {
    case 'rozdani':
      jednou(b, 'pripraven', () => posli(b, { typ: 'PRIPRAVEN', id: ja.id }));
      break;
    case 'sichta':
      if (p.stul.parta.includes(ja.id) && ja.volbaSichty == null) {
        jednou(b, 'volba', () => posli(b, { typ: 'VOLBA_SICHTY', id: ja.id, volba: ja.role === 'saboter' && Math.random() < 0.7 ? 'kazit' : 'makat' }));
      }
      break;
    case 'rozprava':
      if (mojeHrac?.zivy) jednou(b, 'dal', () => posli(b, { typ: 'CHCI_DAL', id: ja.id }));
      break;
    case 'nominace':
      if (mojeHrac?.zivy) {
        jednou(b, 'nom', () => {
          if (ostatniZivi.length && Math.random() < 0.75) posli(b, { typ: 'NOMINOVAT', id: ja.id, cil: nahoda(ostatniZivi).id });
          else posli(b, { typ: 'NENOMINUJU', id: ja.id });
        });
      }
      break;
    case 'rada': {
      const smiHlasovat = mojeHrac?.zivy || (mojeHrac && !mojeHrac.hlasStinuUtracen);
      if (!smiHlasovat) break;
      jednou(b, 'hlas', () => {
        const kandidati = p.stul.kandidati.filter((id) => id !== ja.id);
        const chce = mojeHrac.zivy || Math.random() < 0.3;
        if (kandidati.length && chce) posli(b, { typ: 'HLASOVAT', id: ja.id, cil: nahoda(kandidati) });
        else posli(b, { typ: 'ZDRZUJU_SE', id: ja.id });
      });
      break;
    }
    case 'noc': {
      if (!mojeHrac?.zivy) break;
      const cizi = ostatniZivi.filter((h) => !ja.spoluSaboteri.some((s) => s.id === h.id));
      if (ja.jsemPredak && ja.odmeny.length && p.stul.odmena == null) {
        jednou(b, 'odmena', () => {
          if (ja.odmeny.includes('vrazda') && cizi.length) {
            posli(b, { typ: 'VYBRAT_ODMENU', odmena: 'vrazda' });
            posli(b, { typ: 'PREDAK_ROZHODL', cil: nahoda(cizi).id });
          } else posli(b, { typ: 'VYBRAT_ODMENU', odmena: 'imunita', cil: nahoda(zivi).id });
        });
      } else if (ja.role === 'saboter' && !ja.jsemPredak && cizi.length) {
        jednou(b, 'navrh', () => posli(b, { typ: 'NAVRHNOUT_OBET', id: ja.id, cil: nahoda(cizi).id }));
      } else if (ja.role === 'pracant' && ostatniZivi.length) {
        jednou(b, 'tip', () => posli(b, { typ: 'ZAPSAT_PODEZRELEHO', id: ja.id, cil: nahoda(ostatniZivi).id }));
      }
      break;
    }
    case 'konec':
      b.konecResolve?.();
      break;
    default:
  }
}

async function stul({ n, uroven, posun }, znacka) {
  const t0 = Date.now();
  const nazev = `${n} hráčů, ${uroven}, posun ${posun >= 0 ? '+' : ''}${posun}`;
  const r = await fetch(`${ZAKLAD}/api/mistnost`, { method: 'POST' });
  const { kod } = await r.json();
  const boti = [];
  for (let i = 0; i < n; i++) {
    boti.push(await bot(kod, `Bot${i + 1}`, `${znacka}-${kod}-${i}-${Date.now()}`));
    await cekej(120);
  }
  await cekej(800);
  const zakl = boti[0];
  zakl.ws.send(JSON.stringify({ t: 'akce', a: { typ: 'ZMENIT_NASTAVENI', nastaveni: { uroven, limitPosun: posun } } }));
  await cekej(600);
  posli(zakl, { typ: 'ZACIT' });
  await cekej(1200);

  const limit = DOPORUCENY[uroven][n] + posun;
  const p0 = zakl.pohled;
  console.log(`[${nazev}] místnost ${kod}, start`);
  const vysl = { nazev, kod, ok: true, poznamky: [] };
  const chyba = (txt) => { vysl.ok = false; vysl.poznamky.push(txt); };
  if (!['rozdani', 'predel', 'zadani'].includes(p0.faze)) chyba(`po startu je fáze ${p0.faze}, čekal jsem rozdání nebo první kolo`);
  if (p0.limitSicht !== Math.max(2, limit)) chyba(`limit šicht je ${p0.limitSicht}, čekal jsem ${Math.max(2, limit)}`);
  if (p0.pocetSaboteru !== SABOTERI[n]) chyba(`sabotérů je ${p0.pocetSaboteru}, čekal jsem ${SABOTERI[n]}`);
  const sabotaru = boti.filter((x) => x.pohled?.ja?.role === 'saboter').length;
  if (sabotaru !== SABOTERI[n]) chyba(`rozdáno ${sabotaru} sabotérů, má být ${SABOTERI[n]}`);

  // čekání na konec: všichni boti dostanou pohled s fází konec
  const konec = new Promise((res) => { let zbyva = n; for (const x of boti) x.konecResolve = () => { if (--zbyva === 0) res(); }; });
  // pojistka: když je po minutě stejná fáze a nic se neděje, vypiš to
  let posledniFaze = ''; let odKdy = Date.now();
  const hlidac = setInterval(() => {
    const f = `${zakl.pohled?.faze}|${zakl.pohled?.kolo}|${zakl.pohled?.stul?.mluvi ?? 0}`;
    if (f !== posledniFaze) {
      posledniFaze = f; odKdy = Date.now();
      if (process.env.PODROBNE) console.log(`[${nazev}] kolo ${zakl.pohled?.kolo}, ${zakl.pohled?.faze}${zakl.pohled?.faze === 'posledni_slovo' ? ` ${(zakl.pohled.stul.mluvi ?? 0) + 1}/${zakl.pohled.stul.kandidati.length}` : ''} (živých ${zakl.pohled?.hraci.filter((h) => h.zivy).length})`);
    }
    else if (Date.now() - odKdy > 120000) { vysl.poznamky.push(`zaseklo se ve fázi ${f}`); vysl.ok = false; clearInterval(hlidac); konecNaSilu(); }
  }, 1000);
  let konecNaSilu = () => {};
  const tvrdy = new Promise((res) => { konecNaSilu = res; });
  await Promise.race([konec, tvrdy, cekej(45 * 60 * 1000)]);
  clearInterval(hlidac);

  const p = zakl.pohled;
  const minut = (Date.now() - t0) / 60000;
  if (p.faze !== 'konec') { chyba(`partie nedoběhla, poslední fáze ${p.faze}, kolo ${p.kolo}`); }
  else {
    const role = p.konec?.role ?? {};
    const saboteri = Object.keys(role).filter((id) => role[id] === 'saboter');
    const zijiSab = p.hraci.filter((h) => saboteri.includes(h.id) && h.zivy);
    const zijiPrac = p.hraci.filter((h) => !saboteri.includes(h.id) && h.zivy);
    if (Object.keys(role).length !== n) chyba(`na konci se odhalilo ${Object.keys(role).length} rolí, má být ${n}`);
    if (saboteri.length !== SABOTERI[n]) chyba(`v odhalení je ${saboteri.length} sabotérů`);
    if (p.vitez === 'pracanti' && zijiSab.length > 0) chyba('vyhráli pracanti, ale sabotér žije');
    if (p.vitez === 'saboteri' && !(p.kolo > p.limitSicht || zijiPrac.length === 0)) {
      chyba(`vyhráli sabotéři, ale limit (${p.limitSicht}, kolo ${p.kolo}) nedošel a pracant žije`);
    }
    if (p.vitez == null) chyba('konec bez vítěze, přitom nikdo neukončoval');
    if (p.kolo > p.limitSicht + 1) chyba(`kolo ${p.kolo} je za limitem ${p.limitSicht}`);
    if (p.nastaveni.uroven !== uroven || p.nastaveni.limitPosun !== posun) chyba(`nastavení se po cestě změnilo: ${JSON.stringify(p.nastaveni)}`);
    const rozdilne = boti.filter((x) => x.pohled.faze !== 'konec' || x.pohled.vitez !== p.vitez || x.pohled.kolo !== p.kolo);
    if (rozdilne.length) chyba(`${rozdilne.length} botů vidí jiný konec než zakladatel`);
    vysl.shrnuti = `${p.vitez} (${p.duvodKonce}), kolo ${p.kolo} z ${p.limitSicht}, ${minut.toFixed(1)} min`;
  }
  const sChybou = boti.filter((x) => x.chyba);
  if (sChybou.length) chyba(`chyby u botů: ${sChybou.map((x) => `${x.jmeno}: ${x.chyba}`).join('; ')}`);
  for (const x of boti) { try { x.ws.close(); } catch { /* už zavřené */ } }
  return vysl;
}

async function main() {
  console.log(`\nTest celých partií proti ${ZAKLAD}`);
  console.log(`Stoly: ${STOLY.map((s) => `${s.n} hráčů (${s.uroven}, ${s.posun >= 0 ? '+' : ''}${s.posun})`).join(', ')}\n`);
  const vysledky = await Promise.all(STOLY.map((s, i) => stul(s, `partie${i}`)));
  console.log('\nVýsledky');
  for (const v of vysledky) {
    overit(v.ok, `${v.nazev}${v.shrnuti ? `: ${v.shrnuti}` : ''}`);
    for (const x of v.poznamky) console.log(`       ${x}`);
  }
  console.log(`\n${selhani === 0 ? 'Všechno prošlo.' : `${selhani} selhání.`}\n`);
  process.exit(selhani === 0 ? 0 : 1);
}

main().catch((e) => { console.error('\nSpadlo to:', e.message); process.exit(1); });
