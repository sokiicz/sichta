#!/usr/bin/env node
// Audit obrazovek Šichty. Kontroluje to, co jde zkontrolovat strojem.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'project';
const files = readdirSync(DIR).filter((f) => f.startsWith('P') && f.endsWith('.dc.html')).sort();
const known = new Set(readdirSync(DIR).filter((f) => f.endsWith('.dc.html')));

const TOKENS = new Set(['#1C1F20','#24282A','#303436','#3C4143','#5B5F61','#8D908E','#9C9E9B','#DEDCD6','#EFEDE7',
  '#7A3410','#A84A1A','#C4622C','#E88B45','#7FA37A','#B8422E','#4A4E50','#6E7274',
  '#F2EFE3','#E2DED0','#BAB8B2','#FFECE6','#FFCFC4','#E8897A','#9BC095','#12240F','#223A20','#6E7A70','#4C584F','#F2A868']);

const issues = [];
const add = (file, sev, kind, msg) => issues.push({ file, sev, kind, msg });

for (const f of files) {
  const src = readFileSync(join(DIR, f), 'utf8');

  // 1. povinná kostra
  if (!src.includes('<script src="./support.js"></script>')) add(f, 'KRIT', 'kostra', 'chybí support.js');
  if (!src.includes('data-dc-script')) add(f, 'KRIT', 'kostra', 'chybí dc-script blok');
  if (!src.includes('"$preview"')) add(f, 'KRIT', 'kostra', 'chybí $preview');
  if (!/<html lang="cs">/.test(src)) add(f, 'STŘED', 'kostra', 'chybí lang="cs"');
  if (!/<title>[^<]+<\/title>/.test(src)) add(f, 'STŘED', 'a11y', 'chybí title');

  // 2. rozměr kořene
  if (!/width:\s*390px;\s*height:\s*844px/.test(src)) add(f, 'KRIT', 'rozmer', 'kořen nemá 390x844');

  // 3. odkazy
  for (const m of src.matchAll(/href="([^"#]+\.dc\.html)"/g)) {
    if (!known.has(m[1])) add(f, 'KRIT', 'odkaz', `cíl neexistuje: ${m[1]}`);
  }

  // 4. em-dash a rovné uvozovky v textu
  if (src.includes('—')) add(f, 'VYSOK', 'copy', 'obsahuje em-dash');
  const text = src.replace(/<[^>]+>/g, ' ');
  if (/„[^“]*"/.test(text)) add(f, 'STŘED', 'copy', 'rovná koncová uvozovka');

  // 5. dotykové plochy
  for (const m of src.matchAll(/(<(?:button|a)\b[^>]*)>/g)) {
    const tag = m[1];
    if (!/min-height|height:/.test(tag)) continue;
    const mh = tag.match(/min-height:\s*(\d+)px/);
    const h = tag.match(/(?<!min-)height:\s*(\d+)px/);
    let v = mh ? +mh[1] : h ? +h[1] : null;
    // padding se do dotykove plochy pocita
    const padShort = tag.match(/padding:\s*(\d+)px\s+[\d.]+(?:px)?\s*[;"]/);
    const padOne = tag.match(/padding:\s*(\d+)px\s*[;"]/);
    const padTop = padShort ? +padShort[1] : padOne ? +padOne[1] : 0;
    if (v !== null) v += padTop * 2;
    if (v !== null && v < 44) add(f, 'VYSOK', 'dotyk', `dotykova plocha ${v}px, minimum je 44`);
  }

  // 6. ikonová tlačítka bez popisku
  for (const m of src.matchAll(/<(?:button|a)\b([^>]*)>\s*<svg/g)) {
    if (!/aria-label=/.test(m[1])) add(f, 'VYSOK', 'a11y', 'ikonový prvek bez aria-label');
  }

  // 7. barvy mimo tokeny
  for (const m of src.matchAll(/#[0-9A-Fa-f]{6}/g)) {
    const hex = m[0].toUpperCase();
    if (!TOKENS.has(hex)) add(f, 'STŘED', 'barva', `barva mimo tokeny: ${hex}`);
  }

  // 8. input bez label
  for (const m of src.matchAll(/<input\b([^>]*)>/g)) {
    const id = m[1].match(/id="([^"]+)"/);
    if (!id) { add(f, 'VYSOK', 'a11y', 'input bez id'); continue; }
    if (!new RegExp(`for="${id[1]}"`).test(src)) add(f, 'VYSOK', 'a11y', `input #${id[1]} bez label`);
  }

  // 9. přetečení: součet pevných výšek v kořeni
  const roots = src.match(/padding:\s*(\d+)px[^"]*"[^>]*>([\s\S]*)<\/div>\s*<\/x-dc>/);
  const heights = [...src.matchAll(/min-height:\s*(\d+)px/g)].map((x) => +x[1]);
  const gaps = src.match(/gap:\s*(\d+)px/);
  const pad = src.match(/padding:\s*(\d+)px;\s*display:\s*flex;\s*flex-direction:\s*column/);
  // mřížka staví prvky do sloupců, sčítat je jako sloupec dává nesmysl
  const gridCols = src.match(/grid-template-columns:\s*repeat\((\d+)/);
  if (heights.length && !gridCols) {
    const sum = heights.reduce((a, b) => a + b, 0);
    const gapN = gaps ? +gaps[1] : 0;
    const padN = pad ? +pad[1] * 2 : 44;
    const est = sum + gapN * heights.length + padN;
    if (est > 844) add(f, 'NÍZKÁ', 'rozmer', `součet pevných výšek ~${est}px při 844px (hrubý odhad, flex to může unést)`);
  }

  // 10. role text prozrazující roli na sdílené obrazovce
  if (/P1[1-4]|P16|P17|P19/.test(f)) {
    if (/sabot[ée]r/i.test(text) && !/SABOTÉŘI/.test(text)) {
      add(f, 'KRIT', 'tajnost', 'sdílená obrazovka zmiňuje sabotéra');
    }
  }
}

// souhrn
const bySev = { KRIT: [], VYSOK: [], STŘED: [], 'NÍZKÁ': [] };
for (const i of issues) bySev[i.sev].push(i);

console.log(`\nAUDIT: ${files.length} obrazovek, ${issues.length} nálezů\n`);
for (const sev of ['KRIT', 'VYSOK', 'STŘED', 'NÍZKÁ']) {
  const list = bySev[sev];
  if (!list.length) continue;
  console.log(`${sev} (${list.length})`);
  console.log('-'.repeat(70));
  const grouped = {};
  for (const i of list) (grouped[i.kind] ||= []).push(i);
  for (const [kind, arr] of Object.entries(grouped)) {
    console.log(`  ${kind}:`);
    const seen = new Set();
    for (const i of arr) {
      const key = `${i.file}|${i.msg}`;
      if (seen.has(key)) continue;
      seen.add(key);
      console.log(`    ${i.file.padEnd(24)} ${i.msg}`);
    }
  }
  console.log('');
}
