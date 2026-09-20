#!/usr/bin/env node
/**
 * Integrační test proti nasazenému workeru. Připojí šest hráčů přes WebSocket,
 * rozdá role a ověří to nejdůležitější: že se po drátě neposílá cizí role.
 *
 * Spuštění (potřebuje Node 22+):
 *   node scripts/test-online.mjs https://sichta.neco.workers.dev
 */

const ZAKLAD = (process.argv[2] ?? process.env['VITE_WORKER_URL'] ?? '').replace(/\/$/, '');
if (!ZAKLAD) {
  console.error('Chybí adresa workeru. Použij: node scripts/test-online.mjs https://...workers.dev');
  process.exit(1);
}

const JMENA = ['Honza', 'Petr', 'Klara', 'Tomas', 'Martin', 'Lucie'];
const cekej = (ms) => new Promise((r) => setTimeout(r, ms));

let selhani = 0;
function overit(podminka, popis) {
  if (podminka) console.log(`  ok   ${popis}`);
  else { console.log(`  CHYBA ${popis}`); selhani++; }
}

function pripojit(kod, token, jmeno) {
  const url = `${ZAKLAD.replace(/^http/, 'ws')}/api/mistnost/${kod}/ws`
    + `?token=${encodeURIComponent(token)}&jmeno=${encodeURIComponent(jmeno)}`;
  const ws = new WebSocket(url);
  const klient = { ws, jmeno, pohled: null, zprav: 0 };
  ws.addEventListener('message', (e) => {
    const d = JSON.parse(e.data);
    if (d.t === 'pohled') { klient.pohled = d.p; klient.zprav++; }
  });
  return new Promise((res, rej) => {
    ws.addEventListener('open', () => res(klient));
    ws.addEventListener('error', () => rej(new Error(`nepřipojil se: ${jmeno}`)));
  });
}

const poslat = (k, akce) => k.ws.send(JSON.stringify({ t: 'akce', a: akce }));

async function main() {
  console.log(`\nTest proti ${ZAKLAD}\n`);

  const r = await fetch(`${ZAKLAD}/api/mistnost`, { method: 'POST' });
  const { kod } = await r.json();
  console.log(`Místnost ${kod}\n`);

  console.log('Připojení a šatna');
  const klienti = [];
  for (const [i, j] of JMENA.entries()) {
    klienti.push(await pripojit(kod, `token-test-${i}-${Date.now()}`, j));
    await cekej(250);
  }
  await cekej(900);

  const prvni = klienti[0];
  overit(prvni.pohled != null, 'server poslal pohled bez vyžádání');
  overit(prvni.pohled?.hraci.length === 6, `v šatně je 6 hráčů (je ${prvni.pohled?.hraci.length})`);
  overit(prvni.pohled?.hraci[0]?.zakladatel === true, 'první příchozí je zakladatel');
  overit(prvni.pohled?.faze === 'satna', 'fáze je šatna');

  console.log('\nRozdání rolí');
  poslat(prvni, { typ: 'ZACIT' });
  await cekej(1200);

  const role = klienti.map((k) => k.pohled?.ja?.role);
  const saboteri = klienti.filter((k) => k.pohled?.ja?.role === 'saboter');
  const pracanti = klienti.filter((k) => k.pohled?.ja?.role === 'pracant');

  overit(role.every((x) => x === 'saboter' || x === 'pracant'), 'každý dostal roli');
  overit(saboteri.length === 2, `2 sabotéři (je ${saboteri.length})`);
  overit(pracanti.length === 4, `4 pracanti (je ${pracanti.length})`);

  console.log('\nÚnik rolí po drátě');
  for (const k of pracanti) {
    const text = JSON.stringify(k.pohled);
    overit(!text.includes('"saboter"'), `${k.jmeno} (pracant) nemá v datech slovo saboter`);
    overit(k.pohled.ja.spoluSaboteri.length === 0, `${k.jmeno} nevidí žádné sabotéry`);
  }
  for (const k of saboteri) {
    overit(k.pohled.ja.spoluSaboteri.length === 1, `${k.jmeno} (sabotér) vidí toho druhého`);
  }
  overit(
    saboteri.every((k) => k.pohled.konec === null),
    'konec hry je zatím null, role se neposílají dopředu',
  );

  console.log('\nPřipravenost');
  for (const k of klienti.slice(0, 5)) poslat(k, { typ: 'PRIPRAVEN', id: k.pohled.ja.id });
  await cekej(1000);
  overit(prvni.pohled?.faze === 'rozdani', 'pět z šesti nestačí, hra pořád stojí');
  overit(prvni.pohled?.stul.odevzdali.length === 5, `stůl vidí, kolik jich je připravených (${prvni.pohled?.stul.odevzdali.length})`);

  const posledni = klienti[5];
  poslat(posledni, { typ: 'PRIPRAVEN', id: posledni.pohled.ja.id });
  await cekej(1400);
  overit(prvni.pohled?.faze !== 'rozdani', `poslední potvrzení hru rozjede (fáze ${prvni.pohled?.faze})`);

  console.log('\nTajná volba na šichtě');
  // dál si fáze posouvá server sám podle alarmu
  for (let i = 0; i < 30 && prvni.pohled?.faze !== 'sichta'; i++) await cekej(1000);
  overit(prvni.pohled?.faze === 'sichta', `server došel sám do fáze šichta (je ${prvni.pohled?.faze})`);

  if (prvni.pohled?.faze === 'sichta') {
    const parta = prvni.pohled.stul.parta;
    const vParte = klienti.filter((k) => parta.includes(k.pohled.ja.id));
    overit(vParte.length === parta.length, `parta má ${parta.length} lidí a všichni jsou připojení`);
    overit(prvni.pohled.stul.sabotazi === null, 'během šichty se počet sabotáží neukazuje');

    for (const k of vParte) poslat(k, { typ: 'VOLBA_SICHTY', id: k.pohled.ja.id, volba: 'kazit' });
    await cekej(1200);

    const mimo = klienti.find((k) => !parta.includes(k.pohled.ja.id));
    overit(
      mimo == null || mimo.pohled.stul.odevzdali.length === parta.length,
      'stůl vidí, KDO odevzdal',
    );
    overit(
      mimo == null || !JSON.stringify(mimo.pohled.stul).includes('kazit'),
      'stůl nevidí, CO kdo odevzdal',
    );
  }

  console.log('\nNávrat po výpadku');
  const token = `token-navrat-${Date.now()}`;
  const a = await pripojit(kod, token, 'Navrat');
  await cekej(600);
  const idPrvni = a.pohled?.ja?.id;
  a.ws.close();
  await cekej(600);
  const b = await pripojit(kod, token, 'Navrat');
  await cekej(900);
  overit(b.pohled?.ja?.id === idPrvni, 'stejný token vrátí stejného hráče');

  for (const k of [...klienti, b]) k.ws.close();

  console.log(`\n${selhani === 0 ? 'Všechno prošlo.' : `${selhani} selhání.`}\n`);
  process.exit(selhani === 0 ? 0 : 1);
}

main().catch((e) => { console.error('\nSpadlo to:', e.message); process.exit(1); });
