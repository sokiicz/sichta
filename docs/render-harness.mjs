#!/usr/bin/env node
// Vytáhne kořenový div z každé obrazovky a poskládá je do jedné stránky,
// kde se dá skutečně změřit, jestli se obsah vejde do 390x844.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'project';
const files = readdirSync(DIR).filter((f) => /^P\d\d.*\.dc\.html$/.test(f)).sort();

const cards = files.map((f) => {
  const src = readFileSync(join(DIR, f), 'utf8');
  const body = src.split('</helmet>')[1].split('</x-dc>')[0].trim();
  // kořen zůstává pevných 844, přesně jak v aplikaci
  const measurable = body;
  return `<figure data-screen="${f}" style="margin:0">
  <figcaption style="font:600 12px/1.4 system-ui;color:#888;padding:6px 0">${f}</figcaption>
  <div class="frame">${measurable}</div>
</figure>`;
}).join('\n');

const html = `<!doctype html>
<html lang="cs"><head><meta charset="utf-8"><title>Šichta harness</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Karla:wght@400;600;700&display=swap">
<style>
  body { margin:0; background:#111; padding:16px; }
  .grid { display:flex; flex-wrap:wrap; gap:24px; }
  .frame { width:390px; overflow:visible; outline:1px solid #555; }
</style></head>
<body>
<div class="grid">
${cards}
</div>
<script>
window.measure = function () {
  const out = [];
  document.querySelectorAll('figure').forEach((fig) => {
    const root = fig.querySelector('.frame > div, .frame > a');
    if (!root) { out.push({ screen: fig.dataset.screen, error: 'kořen nenalezen' }); return; }
    const h = Math.ceil(root.getBoundingClientRect().height);
    const w = Math.ceil(root.getBoundingClientRect().width);
    // co se do pevne vysky nevejde a neni ve scrollovacim kontejneru
    const clip = root.scrollHeight - root.clientHeight;
    // najdi potomky, co přetékají vodorovně
    let wide = 0;
    root.querySelectorAll('*').forEach((el) => {
      const r = el.getBoundingClientRect();
      const rr = root.getBoundingClientRect();
      if (r.right > rr.right + 1 || r.left < rr.left - 1) wide++;
    });
    out.push({ screen: fig.dataset.screen, h, w, clip, wide });
  });
  return out;
};
</script>
</body></html>`;

writeFileSync('harness.html', html);
console.log(`harness.html: ${files.length} obrazovek`);
