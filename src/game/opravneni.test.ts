import { describe, expect, it } from 'vitest';
import { smiPoslat } from './opravneni';
import { prazdnyStav, reducer, ziviPracanti, ziviSaboteri } from './machine';
import type { Stav } from './types';

/**
 * Po síti posílá akce konkrétní telefon. Tyhle testy hlídají, že si nikdo
 * nemůže spustit hru, přeskočit fázi nebo rozhodovat za předáka.
 */
function rozehrat(pocet = 6): Stav {
  let s = prazdnyStav();
  for (let i = 0; i < pocet; i++) s = reducer(s, { typ: 'PRIDAT_HRACE', id: `h${i}`, jmeno: `H${i}` }, 9);
  return reducer(s, { typ: 'ZACIT', seed: 9 }, 9);
}

describe('kdo smí co poslat', () => {
  const s = rozehrat();
  const zakladatel = s.hraci.find((h) => h.zakladatel)!.id;
  const jiny = s.hraci.find((h) => !h.zakladatel)!.id;

  it('fáze, spojení a přidávání hráčů patří serveru', () => {
    for (const id of [zakladatel, jiny]) {
      expect(smiPoslat(s, { typ: 'DALSI_FAZE' }, id)).toBe(false);
      expect(smiPoslat(s, { typ: 'ODPOJIL_SE', id }, id)).toBe(false);
      expect(smiPoslat(s, { typ: 'PRIPOJIL_SE', id }, id)).toBe(false);
      expect(smiPoslat(s, { typ: 'PRIDAT_HRACE', id: 'x', jmeno: 'X' }, id)).toBe(false);
    }
  });

  it('o místnosti rozhoduje jen zakladatel', () => {
    expect(smiPoslat(s, { typ: 'ZACIT' }, zakladatel)).toBe(true);
    expect(smiPoslat(s, { typ: 'ZACIT' }, jiny)).toBe(false);
    expect(smiPoslat(s, { typ: 'ZMENIT_NASTAVENI', nastaveni: { vrazdy: false } }, jiny)).toBe(false);
    expect(smiPoslat(s, { typ: 'ZNOVU' }, jiny)).toBe(false);
    expect(smiPoslat(s, { typ: 'UKONCIT' }, zakladatel)).toBe(true);
    expect(smiPoslat(s, { typ: 'UKONCIT' }, jiny)).toBe(false);
    expect(smiPoslat(s, { typ: 'HRAT_BEZ_NEJ', id: jiny }, zakladatel)).toBe(true);
    expect(smiPoslat(s, { typ: 'HRAT_BEZ_NEJ', id: zakladatel }, jiny)).toBe(false);
  });

  it('odejít smí každý sám, vyhodit smí jen zakladatel', () => {
    expect(smiPoslat(s, { typ: 'ODEBRAT_HRACE', id: jiny }, jiny)).toBe(true);
    expect(smiPoslat(s, { typ: 'ODEBRAT_HRACE', id: jiny }, zakladatel)).toBe(true);
    const treti = s.hraci.find((h) => h.id !== jiny && h.id !== zakladatel)!.id;
    expect(smiPoslat(s, { typ: 'ODEBRAT_HRACE', id: jiny }, treti)).toBe(false);
  });

  it('noc patří předákovi', () => {
    const predak = s.predak!;
    const sab = ziviSaboteri(s).find((h) => h.id !== predak)!.id;
    const prac = ziviPracanti(s)[0]!.id;
    expect(smiPoslat(s, { typ: 'VYBRAT_ODMENU', odmena: 'tma' }, predak)).toBe(true);
    expect(smiPoslat(s, { typ: 'VYBRAT_ODMENU', odmena: 'tma' }, sab)).toBe(false);
    expect(smiPoslat(s, { typ: 'VYBRAT_ODMENU', odmena: 'tma' }, prac)).toBe(false);
    expect(smiPoslat(s, { typ: 'PREDAK_ROZHODL', cil: prac }, sab)).toBe(false);
    expect(smiPoslat(s, { typ: 'PREDAK_ROZHODL', cil: prac }, predak)).toBe(true);
  });

  it('za sebe ano, za jiného ne', () => {
    expect(smiPoslat(s, { typ: 'NOMINOVAT', id: jiny, cil: zakladatel }, jiny)).toBe(true);
    expect(smiPoslat(s, { typ: 'NOMINOVAT', id: jiny, cil: zakladatel }, zakladatel)).toBe(false);
    expect(smiPoslat(s, { typ: 'VOLBA_SICHTY', id: jiny, volba: 'kazit' }, zakladatel)).toBe(false);
    expect(smiPoslat(s, { typ: 'PRIPRAVEN', id: jiny }, jiny)).toBe(true);
    expect(smiPoslat(s, { typ: 'CHCI_DAL', id: jiny }, jiny)).toBe(true);
  });

  it('kdo v místnosti není, nesmí nic', () => {
    expect(smiPoslat(s, { typ: 'CHCI_DAL', id: 'cizi' }, 'cizi')).toBe(false);
  });
});
