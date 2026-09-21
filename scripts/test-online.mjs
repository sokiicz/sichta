#!/usr/bin/env node
/**
 * Integrační test proti workeru. Připojí hráče přes WebSocket a projde
 * partii tak, jak ji projdou telefony: rozdání rolí, šichtu, rozpravu,
 * nominace, noc s návrhy a odměnou, ráno, výpadek uprostřed šichty.
 *
 * Co hlídá:
 * - po drátě se neposílá cizí role ani nic, co má přijít až později,
 * - role nezávisí na pořadí příchodu (dvě místnosti, různí sabotéři),
 * - kdo smí co poslat (start, posun fáze, odměna),
 * - fáze skončí dřív, když odevzdali všichni,
 * - pauza zastaví odpočet a po návratu pokračuje od stejné vteřiny,
 * - do rozehrané hry se nikdo nepřidá.
 *
 * Spuštění (potřebuje Node 22+):
 *   node scripts/test-online.mjs http://localhost:8787
 *   node scripts/test-online.mjs https://sichta.neco.workers.dev
 */

const ZAKLAD = (process.argv[2] ?? process.env['VITE_WORKER_URL'] ?? '').replace(/\/$/, '');
if (!ZAKLAD) {
  console.error('Chybí adresa workeru. Použij: node scripts/test-online.mjs http://localhost:8787');
  process.exit(1);
}

const JMENA = ['Honza', 'Petr', 'Klara', 'Tomas', 'Martin', 'Lucie'];
const cekej = (ms) => new Promise((r) => setTimeout(r, ms));

let selhani = 0;
function overit(podminka, popis) {
  if (podminka) console.log(`  ok   ${popis}`);
  else { console.log(`  CHYBA ${popis}`); selhani++; }
}

/** Počká, až fáze (kohokoliv z klientů) bude jedna z daných, nejvýš `ms`. */
async function pockatNaFazi(k, faze, ms) {
  const cil = Array.isArray(faze) ? faze : [faze];
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (cil.includes(k.pohled?.faze)) return Date.now() - start;
    await cekej(100);
  }
  return -1;
}

function pripojit(kod, token, jmeno) {
  const url = `${ZAKLAD.replace(/^http/, 'ws')}/api/mistnost/${kod}/ws`
    + `?token=${encodeURIComponent(token)}&jmeno=${encodeURIComponent(jmeno)}`;
  const ws = new WebSocket(url);
  const klient = { ws, jmeno, token, kod, pohled: null, chyba: null, zprav: 0 };
  ws.addEventListener('message', (e) => {
    const d = JSON.parse(e.data);
    if (d.t === 'pohled') { klient.pohled = d.p; klient.zprav++; }
    if (d.t === 'chyba') klient.chyba = d.kod;
  });
  return new Promise((res, rej) => {
    ws.addEventListener('open', () => res(klient));
    ws.addEventListener('error', () => rej(new Error(`nepřipojil se: ${jmeno}`)));
  });
}

const poslat = (k, akce) => k.ws.send(JSON.stringify({ t: 'akce', a: akce }));
const id = (k) => k.pohled.ja.id;

async function mistnost(jmena, znacka) {
  const r = await fetch(`${ZAKLAD}/api/mistnost`, { method: 'POST' });
  const { kod } = await r.json();
  const klienti = [];
  for (const [i, j] of jmena.entries()) {
    klienti.push(await pripojit(kod, `${znacka}-${kod}-${i}-${Date.now()}`, j));
    await cekej(150);
  }
  await cekej(700);
  return { kod, klienti };
}

async function main() {
  console.log(`\nTest proti ${ZAKLAD}\n`);

  // ---------------------------------------------------------------- šatna
  console.log('Připojení a šatna');
  const { kod, klienti } = await mistnost(JMENA, 'test');
  console.log(`  místnost ${kod}`);
  const zakladatel = klienti[0];
  const jiny = klienti[3];
  overit(zakladatel.pohled != null, 'server poslal pohled bez vyžádání');
  overit(zakladatel.pohled?.hraci.length === 6, `v šatně je 6 hráčů (je ${zakladatel.pohled?.hraci.length})`);
  overit(zakladatel.pohled?.hraci[0]?.zakladatel === true, 'první příchozí je zakladatel');
  overit(zakladatel.pohled?.faze === 'satna', 'fáze je šatna');
  overit(typeof zakladatel.pohled?.konecFaze === 'object', 'v šatně neběží odpočet');

  poslat(jiny, { typ: 'ZACIT' });
  await cekej(700);
  overit(zakladatel.pohled?.faze === 'satna', 'start od nezakladatele se zahodí');

  // ---------------------------------------------------------------- role a náhoda
  console.log('\nRozdání rolí');
  poslat(zakladatel, { typ: 'ZACIT' });
  await cekej(900);
  overit(zakladatel.pohled?.faze === 'rozdani', `zakladatel hru spustí (fáze ${zakladatel.pohled?.faze})`);
  overit(typeof zakladatel.pohled?.partie === 'string', 'partie má identifikátor');

  const saboteri = klienti.filter((k) => k.pohled?.ja?.role === 'saboter');
  const pracanti = klienti.filter((k) => k.pohled?.ja?.role === 'pracant');
  overit(saboteri.length === 2 && pracanti.length === 4, `2 sabotéři a 4 pracanti (${saboteri.length}/${pracanti.length})`);
  for (const k of pracanti) {
    overit(!JSON.stringify(k.pohled).includes('"saboter"'), `${k.jmeno} (pracant) nemá v datech slovo saboter`);
  }
  for (const k of saboteri) overit(k.pohled.ja.spoluSaboteri.length === 1, `${k.jmeno} (sabotér) vidí toho druhého`);
  const predak = saboteri.find((k) => k.pohled.ja.jsemPredak);
  const sabotér2 = saboteri.find((k) => !k.pohled.ja.jsemPredak);
  overit(predak != null && sabotér2 != null, 'právě jeden ze sabotérů je předák');

  // druhá a třetí místnost se stejným pořadím jmen: role se musí lišit
  const dalsi = [];
  for (const z of ['b', 'c']) {
    const m = await mistnost(JMENA, z);
    poslat(m.klienti[0], { typ: 'ZACIT' });
    await cekej(900);
    dalsi.push(m.klienti.filter((k) => k.pohled?.ja?.role === 'saboter').map(id).join(','));
    for (const k of m.klienti) k.ws.close();
  }
  const prvni = saboteri.map(id).join(',');
  overit(dalsi.some((x) => x !== prvni), `role nezávisí na pořadí příchodu (${prvni} / ${dalsi.join(' / ')})`);

  // ---------------------------------------------------------------- posun fáze
  console.log('\nPosun fáze');
  poslat(jiny, { typ: 'DALSI_FAZE' });
  await cekej(700);
  overit(zakladatel.pohled?.faze === 'rozdani', 'posun fáze od klienta se zahodí');

  for (const k of klienti.slice(0, 5)) poslat(k, { typ: 'PRIPRAVEN', id: id(k) });
  await cekej(800);
  overit(zakladatel.pohled?.faze === 'rozdani', 'pět z šesti nestačí, hra pořád stojí');
  overit(zakladatel.pohled?.stul.odevzdali.length === 5, `stůl vidí, kolik jich je připravených (${zakladatel.pohled?.stul.odevzdali.length})`);
  poslat(klienti[5], { typ: 'PRIPRAVEN', id: id(klienti[5]) });
  overit((await pockatNaFazi(zakladatel, ['predel', 'zadani'], 3000)) >= 0, `poslední potvrzení hru rozjede (fáze ${zakladatel.pohled?.faze})`);
  overit(typeof zakladatel.pohled?.konecFaze === 'number', 'server posílá, kdy fáze končí');

  // ---------------------------------------------------------------- šichta končí, když odevzdají všichni
  console.log('\nŠichta');
  overit((await pockatNaFazi(zakladatel, 'sichta', 25000)) >= 0, `server došel sám do fáze šichta (je ${zakladatel.pohled?.faze})`);
  const parta = zakladatel.pohled.stul.parta;
  const vParte = klienti.filter((k) => parta.includes(id(k)));
  overit(vParte.length === parta.length, `parta má ${parta.length} lidí a všichni jsou připojení`);
  overit(zakladatel.pohled.stul.sabotazi === null, 'během šichty se počet sabotáží neukazuje');

  // sabotéři kazí, ať je v noci co dělat
  for (const k of vParte) poslat(k, { typ: 'VOLBA_SICHTY', id: id(k), volba: k.pohled.ja.role === 'saboter' ? 'kazit' : 'makat' });
  const zaJak = await pockatNaFazi(zakladatel, 'vysledek', 6000);
  overit(zaJak >= 0 && zaJak < 5000, `po odevzdání celé party skončí šichta dřív než za 45 s (za ${zaJak} ms)`);
  const padla = zakladatel.pohled.stul.padla === true;
  console.log(`  šichta ${padla ? 'padla' : 'prošla'} (sabotáží ${zakladatel.pohled.stul.sabotazi})`);

  // ---------------------------------------------------------------- rozprava a nominace
  console.log('\nRozprava a nominace');
  overit((await pockatNaFazi(zakladatel, ['rozprava', 'septanda'], 30000)) >= 0, `po výsledku přijde rozprava nebo šeptanda (${zakladatel.pohled?.faze})`);
  if (zakladatel.pohled.faze === 'septanda') {
    for (const k of klienti) overit(typeof k.pohled.ja.septanda === 'string', `${k.jmeno} má vlastní větu`);
    await pockatNaFazi(zakladatel, 'rozprava', 30000);
  }
  overit(zakladatel.pohled.stul.hlasy.length === 0 && zakladatel.pohled.stul.historie.length === 1, 'historie nese hotové kolo, hlasy zatím žádné');
  for (const k of klienti.slice(0, 4)) poslat(k, { typ: 'CHCI_DAL', id: id(k) });
  overit((await pockatNaFazi(zakladatel, 'nominace', 3000)) >= 0, 'nadpoloviční většina utne rozpravu');

  for (const k of klienti) poslat(k, { typ: 'NENOMINUJU', id: id(k) });
  const bezRady = await pockatNaFazi(zakladatel, 'vyhosteni', 6000);
  overit(bezRady >= 0, `bez nominací se přeskočí rada a fáze skončí dřív (za ${bezRady} ms)`);
  overit(zakladatel.pohled.stul.vyhosteny === null, 'nikdo neodchází');

  // ---------------------------------------------------------------- noc
  if (padla) {
    console.log('\nNoc');
    overit((await pockatNaFazi(zakladatel, 'noc', 25000)) >= 0, 'po padlé šichtě přijde noc');
    const prac = pracanti[0];
    overit(prac.pohled.ja.odmeny.length === 0, 'pracant nemá nabídku odměn');
    overit(predak.pohled.ja.odmeny.includes('vrazda'), 'předák má v nabídce vraždu');

    poslat(sabotér2, { typ: 'VYBRAT_ODMENU', odmena: 'tma' });
    await cekej(600);
    overit(predak.pohled.stul.odmena === null, 'odměnu nevybere nikdo jiný než předák');

    const cil = id(pracanti[1]);
    poslat(sabotér2, { typ: 'NAVRHNOUT_OBET', id: id(sabotér2), cil });
    await cekej(600);
    overit(predak.pohled.ja.navrhy.some((n) => n.kdo === id(sabotér2) && n.komu === cil), 'předák vidí návrh druhého sabotéra');
    overit(prac.pohled.ja.navrhy.length === 0 && !JSON.stringify(prac.pohled).includes('navrhyObeti'), 'pracant návrhy nevidí');

    const chraneny = id(pracanti[0]);
    poslat(predak, { typ: 'VYBRAT_ODMENU', odmena: 'imunita', cil: chraneny });
    await cekej(600);
    overit(predak.pohled.stul.odmena === 'imunita' && predak.pohled.stul.imunni === chraneny, 'předák vzal imunitu a vidí, koho chrání');
    overit(prac.pohled.stul.odmena === null && prac.pohled.stul.imunni === null, 'pracant se v noci o odměně nedozví');
    overit(prac.pohled.stul.odevzdali.length === 0 && prac.pohled.stul.odevzdalo >= 2, `v noci se posílá jen počet odevzdaných (${prac.pohled.stul.odevzdalo}), ne jména`);

    for (const k of pracanti) poslat(k, { typ: 'ZAPSAT_PODEZRELEHO', id: id(k), cil: id(klienti.find((x) => x !== k)) });
    const ranoZa = await pockatNaFazi(zakladatel, 'rano', 15000);
    overit(ranoZa >= 6000 && ranoZa < 12000, `noc skončí s odstupem po posledním odevzdání, ne hned (za ${ranoZa} ms)`);
    overit(prac.pohled.stul.imunni === chraneny && prac.pohled.stul.odmena === 'imunita', 'ráno se imunita řekne celému stolu');
  } else {
    console.log('\nNoc: šichta prošla, noc se přeskočí (sabotéři v partě nebyli)');
  }

  // ---------------------------------------------------------------- pauza uprostřed šichty
  console.log('\nVýpadek uprostřed šichty');
  overit((await pockatNaFazi(zakladatel, 'sichta', 60000)) >= 0, `další kolo došlo do šichty (${zakladatel.pohled?.faze}, kolo ${zakladatel.pohled?.kolo})`);
  const parta2 = zakladatel.pohled.stul.parta;
  const obet = klienti.find((k) => parta2.includes(id(k)) && k !== zakladatel) ?? klienti.find((k) => parta2.includes(id(k)));
  const konecPred = zakladatel.pohled.konecFaze;
  obet.ws.close();
  await cekej(9500);
  overit(zakladatel.pohled.pauza?.kvuli === id(obet), `po odpojení člena party se hra zastaví (${JSON.stringify(zakladatel.pohled.pauza)})`);
  overit(typeof zakladatel.pohled.pauza?.zbyva === 'number' && zakladatel.pohled.pauza.zbyva <= 45000, 'pauza si pamatuje zbývající čas');
  overit(zakladatel.pohled.konecFaze === null, 'během pauzy odpočet neběží');

  const zbyvalo = zakladatel.pohled.pauza.zbyva;
  const navrat = await pripojit(kod, obet.token, obet.jmeno);
  await cekej(900);
  overit(navrat.pohled?.ja?.id === id(obet), 'stejný token vrátí stejného hráče');
  overit(zakladatel.pohled.pauza === null, 'po návratu pauza zmizí');
  const konecPo = zakladatel.pohled.konecFaze;
  const rozdil = konecPo != null ? konecPo - Date.now() : -1;
  overit(rozdil > 0 && Math.abs(rozdil - zbyvalo) < 3000, `odpočet pokračuje od stejné vteřiny (zbývalo ${Math.round(zbyvalo / 1000)} s, teď ${Math.round(rozdil / 1000)} s, původně končil ${konecPred ? 'v ' + new Date(konecPred).toISOString().slice(11, 19) : '?'})`);

  // ---------------------------------------------------------------- pozdní příchozí
  console.log('\nPozdní příchozí');
  const pozde = await pripojit(kod, `pozde-${Date.now()}`, 'Pozde');
  await cekej(800);
  overit(pozde.chyba === 'hra-bezi', `do rozehrané hry se nikdo nepřidá (${pozde.chyba})`);

  for (const k of [...klienti, navrat, pozde]) { try { k.ws.close(); } catch { /* už zavřené */ } }

  console.log(`\n${selhani === 0 ? 'Všechno prošlo.' : `${selhani} selhání.`}\n`);
  process.exit(selhani === 0 ? 0 : 1);
}

main().catch((e) => { console.error('\nSpadlo to:', e.message); process.exit(1); });
