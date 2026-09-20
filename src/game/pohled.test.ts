import { describe, expect, it } from 'vitest';
import { pohledPro } from './pohled';
import { posledniSmena, prazdnyStav, reducer, ziviSaboteri } from './machine';
import type { Stav } from './types';

function rozehrat(pocet = 6, seed = 42): Stav {
  let s = prazdnyStav();
  for (let i = 0; i < pocet; i++) s = reducer(s, { typ: 'PRIDAT_HRACE', id: `h${i}`, jmeno: `H${i}` }, seed);
  s = reducer(s, { typ: 'ZACIT', seed }, seed);
  return reducer(s, { typ: 'DALSI_FAZE' }, seed);
}

/**
 * Tyhle testy hlídají jedinou věc: že z pohledu nejde vyčíst cizí role.
 * Kdyby se to rozbilo, hra přestane fungovat a nikdo si toho nevšimne.
 */
describe('pohled neprozradí role', () => {
  it('pracant nevidí ani jednoho sabotéra', () => {
    const s = rozehrat();
    const pracant = s.hraci.find((h) => s.role[h.id] === 'pracant')!;
    const p = pohledPro(s, pracant.id);

    expect(p.ja.role).toBe('pracant');
    expect(p.ja.spoluSaboteri).toEqual([]);
    expect(JSON.stringify(p)).not.toContain('"saboter"');
  });

  it('sabotér vidí ostatní sabotéry, protože to je pravidlo hry', () => {
    const s = rozehrat();
    const sab = ziviSaboteri(s)[0]!;
    const p = pohledPro(s, sab.id);

    expect(p.ja.role).toBe('saboter');
    expect(p.ja.spoluSaboteri).toHaveLength(s.pocetSaboteru - 1);
    for (const x of p.ja.spoluSaboteri) expect(s.role[x.id]).toBe('saboter');
  });

  it('nikde není mapa rolí ani předák', () => {
    const s = rozehrat();
    const p = pohledPro(s, 'h0') as unknown as Record<string, unknown>;
    expect(p['role']).toBeUndefined();
    expect(p['predak']).toBeUndefined();
  });
});

describe('pohled drží tajnosti fáze', () => {
  it('během šichty se počet sabotáží neukáže', () => {
    let s = rozehrat();
    while (s.faze !== 'sichta') s = reducer(s, { typ: 'DALSI_FAZE' }, 42);
    for (const id of posledniSmena(s.aktualni!)!.parta) {
      s = reducer(s, { typ: 'VOLBA_SICHTY', id, volba: 'kazit' }, 42);
    }
    expect(pohledPro(s, 'h0').stul.sabotazi).toBeNull();

    s = reducer(s, { typ: 'DALSI_FAZE' }, 42);
    expect(pohledPro(s, 'h0').stul.sabotazi).not.toBeNull();
  });

  it('moje vlastní volba se mi vrátí, cizí ne', () => {
    let s = rozehrat();
    while (s.faze !== 'sichta') s = reducer(s, { typ: 'DALSI_FAZE' }, 42);
    const parta = posledniSmena(s.aktualni!)!.parta;
    const ja = parta[0]!;
    s = reducer(s, { typ: 'VOLBA_SICHTY', id: ja, volba: 'makat' }, 42);

    expect(pohledPro(s, ja).ja.volbaSichty).toBe('makat');
    const jiny = parta.find((x) => x !== ja);
    if (jiny) expect(pohledPro(s, jiny).ja.volbaSichty).toBeNull();
  });

  it('pod Tmou se hlasovací záznam neukáže', () => {
    const s = rozehrat();
    const sTmou: Stav = {
      ...s, faze: 'hlasy', tmaNadHlasovanim: true,
      aktualni: { ...s.aktualni!, hlasy: { h0: 'h1', h2: 'h1' } },
    };
    expect(pohledPro(sTmou, 'h0').stul.hlasy).toEqual([]);
    expect(pohledPro({ ...sTmou, tmaNadHlasovanim: false }, 'h0').stul.hlasy).toHaveLength(2);
  });

  it('role vyhoštěného se odhalí až ve fázi vyhoštění', () => {
    const s = rozehrat();
    const sVyhostenim: Stav = { ...s, faze: 'hlasy', aktualni: { ...s.aktualni!, vyhosteny: 'h1' } };
    expect(pohledPro(sVyhostenim, 'h0').stul.roleVyhosteneho).toBeNull();
    expect(pohledPro({ ...sVyhostenim, faze: 'vyhosteni' }, 'h0').stul.roleVyhosteneho).not.toBeNull();
  });

  it('kdo odevzdal je veřejné, co odevzdal není', () => {
    let s = rozehrat();
    while (s.faze !== 'sichta') s = reducer(s, { typ: 'DALSI_FAZE' }, 42);
    const parta = posledniSmena(s.aktualni!)!.parta;
    s = reducer(s, { typ: 'VOLBA_SICHTY', id: parta[0]!, volba: 'kazit' }, 42);

    const p = pohledPro(s, parta[1]!);
    expect(p.stul.odevzdali).toEqual([parta[0]]);
    expect(JSON.stringify(p.stul)).not.toContain('kazit');
  });
});
