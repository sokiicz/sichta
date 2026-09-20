import { describe, expect, it } from 'vitest';
import { pohledPro } from './pohled';
import { noveKolo, posledniSmena, prazdnyStav, reducer, zivi, ziviPracanti, ziviSaboteri } from './machine';
import type { Akce, Stav } from './types';

function rozehrat(pocet = 6, seed = 42): Stav {
  let s = prazdnyStav();
  for (let i = 0; i < pocet; i++) s = reducer(s, { typ: 'PRIDAT_HRACE', id: `h${i}`, jmeno: `H${i}` }, seed);
  s = reducer(s, { typ: 'ZACIT', seed }, seed);
  return reducer(s, { typ: 'DALSI_FAZE' }, seed);
}

const posli = (s: Stav, a: Akce, seed = 42) => reducer(s, a, seed);

/** Dojede do noci po padlé šichtě. */
function doNoci(): Stav {
  for (let seed = 1; seed < 60; seed++) {
    let s = rozehrat(7, seed);
    for (const h of s.hraci) s = posli(s, { typ: 'PRIPRAVEN', id: h.id }, seed);
    for (let i = 0; i < 40 && s.faze !== 'noc' && s.faze !== 'konec'; i++) {
      if (s.faze === 'sichta') {
        for (const id of posledniSmena(s.aktualni!)!.parta) {
          s = posli(s, { typ: 'VOLBA_SICHTY', id, volba: s.role[id] === 'saboter' ? 'kazit' : 'makat' }, seed);
        }
      }
      if (s.faze === 'nominace') for (const h of zivi(s)) s = posli(s, { typ: 'NENOMINUJU', id: h.id }, seed);
      s = posli(s, { typ: 'DALSI_FAZE' }, seed);
    }
    if (s.faze === 'noc') return s;
  }
  throw new Error('nenašel se seed s padlou šichtou');
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

  it('historie ukazuje role jen u vyhoštěných', () => {
    let s = rozehrat(7);
    const sab = ziviSaboteri(s)[0]!.id;
    s = { ...s, faze: 'rada', aktualni: { ...noveKolo(1), smeny: [{ smena: 'odpoledni', parta: ['h0', 'h1', 'h2'], volby: {}, sabotazi: 0, padla: false }], kandidati: [sab, 'h0'] } };
    for (const h of zivi(s)) s = posli(s, { typ: 'HLASOVAT', id: h.id, cil: sab });
    s = posli(s, { typ: 'DALSI_FAZE' });
    const pracant = ziviPracanti(s)[0]!.id;
    const p = pohledPro(s, pracant);
    expect(p.stul.historie).toHaveLength(1);
    expect(p.stul.historie[0]!.vyhosteny).toBe(sab);
    expect(p.stul.historie[0]!.roleVyhosteneho).toBe('saboter');
    // jediné slovo saboter v celém pohledu patří vyhoštěnému
    expect(JSON.stringify(p).split('"saboter"').length - 1).toBe(1);
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

  it('hlasy z rady se ukážou až při odhalení, ne během hlasování', () => {
    let s = rozehrat();
    s = { ...s, faze: 'rada', aktualni: { ...noveKolo(1), kandidati: ['h1', 'h2'] } };
    s = posli(s, { typ: 'HLASOVAT', id: 'h0', cil: 'h1' });
    expect(pohledPro(s, 'h3').stul.hlasy).toEqual([]);
    expect(pohledPro(s, 'h0').ja.hlasoval).toBe('h1');
    s = { ...s, faze: 'hlasy' };
    expect(pohledPro(s, 'h3').stul.hlasy).toEqual([{ kdo: 'h0', komu: 'h1', stin: false }]);
  });

  it('pod tmou se hlasovací záznam neukáže', () => {
    const s = rozehrat();
    const sTmou: Stav = {
      ...s, faze: 'hlasy',
      aktualni: { ...noveKolo(1), tma: true, hlasy: { h0: 'h1', h2: 'h1' } },
    };
    expect(pohledPro(sTmou, 'h0').stul.hlasy).toEqual([]);
    expect(pohledPro(sTmou, 'h0').stul.tma).toBe(true);
    expect(pohledPro({ ...sTmou, aktualni: { ...sTmou.aktualni!, tma: false } }, 'h0').stul.hlasy).toHaveLength(2);
  });

  it('role vyhoštěného se odhalí až ve fázi vyhoštění', () => {
    const s = rozehrat();
    const sVyhostenim: Stav = { ...s, faze: 'hlasy', aktualni: { ...noveKolo(1), vyhosteny: 'h1' } };
    expect(pohledPro(sVyhostenim, 'h0').stul.roleVyhosteneho).toBeNull();
    expect(pohledPro({ ...sVyhostenim, faze: 'vyhosteni' }, 'h0').stul.roleVyhosteneho).not.toBeNull();
  });

  it('počty nominací jsou vidět až po uzavření nominací', () => {
    let s = rozehrat();
    s = { ...s, faze: 'nominace', aktualni: noveKolo(1) };
    s = posli(s, { typ: 'NOMINOVAT', id: 'h0', cil: 'h1' });
    expect(pohledPro(s, 'h2').stul.nominaci).toBeNull();
    s = posli(s, { typ: 'DALSI_FAZE' });
    expect(s.faze).toBe('kandidati');
    expect(pohledPro(s, 'h2').stul.nominaci).toEqual({ h1: 1 });
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

describe('noc zůstává sabotérům, ráno je veřejné', () => {
  it('oběť a odměnu vidí pracant až ráno', () => {
    let s = doNoci();
    s = posli(s, { typ: 'VYBRAT_ODMENU', odmena: 'vrazda' });
    const obet = ziviPracanti(s)[0]!.id;
    s = posli(s, { typ: 'PREDAK_ROZHODL', cil: obet });
    const pracant = ziviPracanti(s)[1]!.id;
    const vNoci = pohledPro(s, pracant);
    expect(vNoci.stul.obet).toBeNull();
    expect(vNoci.stul.odmena).toBeNull();
    const sab = ziviSaboteri(s).find((h) => h.id !== s.predak) ?? ziviSaboteri(s)[0]!;
    expect(pohledPro(s, sab.id).stul.odmena).toBe('vrazda');
    expect(pohledPro(s, s.predak!).ja.rozhodl).toBe(obet);

    s = posli(s, { typ: 'DALSI_FAZE' });
    expect(s.faze).toBe('rano');
    const rano = pohledPro(s, pracant);
    expect(rano.stul.obet).toBe(obet);
    expect(rano.stul.odmena).toBe('vrazda');
  });

  it('imunita a tma se stolu ukážou ráno, sabotérům hned', () => {
    let s = doNoci();
    const chraneny = ziviPracanti(s)[0]!.id;
    s = posli(s, { typ: 'VYBRAT_ODMENU', odmena: 'imunita', cil: chraneny });
    const pracant = ziviPracanti(s)[1]!.id;
    expect(pohledPro(s, pracant).stul.imunni).toBeNull();
    expect(pohledPro(s, s.predak!).stul.imunni).toBe(chraneny);
    s = posli(s, { typ: 'DALSI_FAZE' });
    expect(pohledPro(s, pracant).stul.imunni).toBe(chraneny);

    let t = doNoci();
    t = posli(t, { typ: 'VYBRAT_ODMENU', odmena: 'tma' });
    expect(pohledPro(t, ziviPracanti(t)[0]!.id).stul.tma).toBe(false);
    t = posli(t, { typ: 'DALSI_FAZE' });
    expect(pohledPro(t, ziviPracanti(t)[0]!.id).stul.tma).toBe(true);
  });

  it('návrhy oběti vidí jen sabotéři', () => {
    let s = doNoci();
    const sab = ziviSaboteri(s).find((h) => h.id !== s.predak) ?? ziviSaboteri(s)[0]!;
    const cil = ziviPracanti(s)[0]!.id;
    s = posli(s, { typ: 'NAVRHNOUT_OBET', id: sab.id, cil });
    const predak = pohledPro(s, s.predak!);
    if (sab.id !== s.predak) expect(predak.ja.navrhy).toEqual([{ kdo: sab.id, komu: cil }]);
    for (const h of ziviPracanti(s)) {
      const p = pohledPro(s, h.id);
      expect(p.ja.navrhy).toEqual([]);
      expect(JSON.stringify(p)).not.toContain('navrhyObeti');
    }
  });

  it('cena za čuch nepočítá sabotéry', () => {
    let s = doNoci();
    const sab = ziviSaboteri(s)[0]!.id;
    const kolega = ziviSaboteri(s)[1]?.id;
    if (!kolega) return;
    s = posli(s, { typ: 'ZAPSAT_PODEZRELEHO', id: sab, cil: kolega });
    const konec: Stav = { ...s, faze: 'konec', vitez: 'pracanti', historie: [...s.historie, s.aktualni!], aktualni: null };
    expect(pohledPro(konec, 'h0').konec?.cuch).toBeNull();
  });
});
