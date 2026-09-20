#!/usr/bin/env node
/**
 * Vygeneruje ikony pro PWA z loga. Bez závislostí: PNG se skládá ručně,
 * protože kvůli třem obdélníkům a jedné čáře nemá smysl tahat do projektu
 * grafickou knihovnu.
 *
 * Spuštění:
 *   node scripts/ikony.mjs
 *
 * Logo je totéž, co kreslí <Znacka> v src/ui/primitives.tsx, jen v rastru:
 * tři zářezy a přes ně rezavý škrt. Souřadnice jsou z viewBoxu 64 x 64.
 */

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const KOREN = join(dirname(fileURLToPath(import.meta.url)), '..');

// barvy z brand/tokens.css
const POZADI = [0x30, 0x34, 0x36]; // ocel-800
const ZAREZ = [0xe8, 0xe6, 0xe3]; // ocel-100
const REZ = [0xe8, 0x8b, 0x45]; // rez-400

/** Kreslítko nad RGB bufferem. Žádné vyhlazování, logo je z rovných hran. */
function platno(velikost) {
  const px = Buffer.alloc(velikost * velikost * 3);
  for (let i = 0; i < velikost * velikost; i++) px.set(POZADI, i * 3);

  const bod = (x, y, barva) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= velikost || y >= velikost) return;
    px.set(barva, (y * velikost + x) * 3);
  };

  return {
    px,
    obdelnik(x, y, s, v, barva) {
      for (let j = y; j < y + v; j++) for (let i = x; i < x + s; i++) bod(i, j, barva);
    },
    /** Tlustá čára: jde se po delší ose a maluje se kolmý štětec. */
    cara(x1, y1, x2, y2, tloustka, barva) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const delka = Math.hypot(dx, dy);
      const kroku = Math.ceil(delka * 2);
      const nx = -dy / delka;
      const ny = dx / delka;
      for (let k = 0; k <= kroku; k++) {
        const t = k / kroku;
        const sx = x1 + dx * t;
        const sy = y1 + dy * t;
        for (let o = -tloustka / 2; o <= tloustka / 2; o += 0.5) {
          bod(sx + nx * o, sy + ny * o, barva);
        }
      }
    },
  };
}

function png(px, velikost) {
  // Každý řádek má před sebou bajt filtru. Nula znamená "žádný filtr".
  const radky = Buffer.alloc(velikost * (velikost * 3 + 1));
  for (let y = 0; y < velikost; y++) {
    radky[y * (velikost * 3 + 1)] = 0;
    px.copy(radky, y * (velikost * 3 + 1) + 1, y * velikost * 3, (y + 1) * velikost * 3);
  }

  const crcTab = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTab[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const usek = (typ, data) => {
    const delka = Buffer.alloc(4);
    delka.writeUInt32BE(data.length);
    const telo = Buffer.concat([Buffer.from(typ, 'ascii'), data]);
    const kontrola = Buffer.alloc(4);
    kontrola.writeUInt32BE(crc(telo));
    return Buffer.concat([delka, telo, kontrola]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(velikost, 0);
  ihdr.writeUInt32BE(velikost, 4);
  ihdr[8] = 8; // bitů na kanál
  ihdr[9] = 2; // truecolor RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    usek('IHDR', ihdr),
    usek('IDAT', deflateSync(radky, { level: 9 })),
    usek('IEND', Buffer.alloc(0)),
  ]);
}

/** `okraj` je podíl strany. Maskovatelná ikona ho potřebuje větší, ořezává se do kruhu. */
function ikona(velikost, okraj) {
  const p = platno(velikost);
  const k = (velikost * (1 - okraj * 2)) / 64;
  const o = velikost * okraj;
  for (const x of [10, 26, 42]) p.obdelnik(o + x * k, o + 12 * k, 8 * k, 40 * k, ZAREZ);
  p.cara(o + 5 * k, o + 50 * k, o + 59 * k, o + 14 * k, 8 * k, REZ);
  return png(p.px, velikost);
}

mkdirSync(join(KOREN, 'public'), { recursive: true });
for (const [jmeno, velikost, okraj] of [
  ['icon-192.png', 192, 0.16],
  ['icon-512.png', 512, 0.16],
  ['icon-maskable.png', 512, 0.26],
  ['apple-touch-icon.png', 180, 0.14],
]) {
  const data = ikona(velikost, okraj);
  writeFileSync(join(KOREN, 'public', jmeno), data);
  console.log(`public/${jmeno}  ${velikost}x${velikost}  ${(data.length / 1024).toFixed(1)} kB`);
}
