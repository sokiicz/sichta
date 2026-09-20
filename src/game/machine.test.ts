import { describe, expect, it } from 'vitest';
import { pohledPro } from './pohled';
import {
  prazdnyStav, reducer, dostupneOdmeny, smiKazit, zivi, ziviSaboteri, ziviPracanti, posledniSmena,
  noveKolo, fazeHotova, kdoOdevzdal,
} from './machine';
import { sestavaPro, velikostParty, MIN_HRACU, MAX_HRACU } from './rules';
import type { Akce, Stav } from './types';

const JMENA = ['Honza', 'Petr', 'Klára', 'Tomáš', 'Martin', 'Lucie', 'Eva', 'Dan', 'Iva', 'Karel', 'Nela', 'Ota'];

function sesli(pocet: number): Stav {
  let s = prazdnyStav();
  for (let i = 0; i < pocet; i++) {
    s = reducer(s, { typ: 'PRIDAT_HRACE', id: `h${i}`, jmeno: JMENA[i]! }, 1);
  }
  return s;
}

function rozehrat(pocet: number, seed = 42): Stav {
  return reducer(sesli(pocet), { typ: 'ZACIT', seed }, seed);
}

const dal = (s: Stav, seed = 42): Stav => reducer(s, { typ: 'DALSI_FAZE' }, seed);
const posli = (s: Stav, a: Akce, seed = 42): Stav => reducer(s, a, seed);

/**
 * Dojede partii do zadané fáze. Na šichtě kazí sabotéři (nebo nikdo),
 * nominace jdou na prvního jiného živého, rada volí prvního kandidáta.
 */
function doFaze(pocet: number, faze: string, volby: { kazi?: boolean; nominovat?: boolean; seed?: number } = {}): Stav {
  const seed = volby.seed ?? 42;
  let s = rozehrat(pocet, seed);
  for (const h of s.hraci) s = posli(s, { typ: 'PRIPRAVEN', id: h.id }, seed);
  for (let i = 0; i < 80 && s.faze !== faze && s.faze !== 'konec'; i++) {
    if (s.faze === 'sichta') {
      for (const id of posledniSmena(s.aktualni!)!.parta) {
        const kazi = (volby.kazi ?? true) && s.role[id] === 'saboter';
        s = posli(s, { typ: 'VOLBA_SICHTY', id, volba: kazi ? 'kazit' : 'makat' }, seed);
      }
    }
    if (s.faze === 'nominace' && (volby.nominovat ?? true)) {
      const ziviIds = zivi(s).map((h) => h.id);
      for (const id of ziviIds) s = posli(s, { typ: 'NOMINOVAT', id, cil: ziviIds.find((x) => x !== id)! }, seed);
    }
    if (s.faze === 'rada') {
      const cil = s.aktualni!.kandidati[0];
      if (cil) for (const h of zivi(s)) s = posli(s, { typ: 'HLASOVAT', id: h.id, cil }, seed);
    }
    if (s.faze === 'noc' && faze !== 'noc') {
      s = posli(s, { typ: 'VYBRAT_ODMENU', odmena: 'tma' }, seed);
    }
    s = dal(s, seed);
  }
  return s;
}

describe('sestava podle počtu hráčů', () => {
  it('pokrývá celé podporované rozpětí', () => {
    for (let n = MIN_HRACU; n <= MAX_HRACU; n++) {
      const s = sestavaPro(n);
      expect(s.saboteri).toBeGreaterThan(0);
      expect(s.saboteri).toBeLessThan(n / 2);
      expect(s.limitSicht).toBeGreaterThan(0);
    }
  });

  it('mimo rozpětí spadne, místo aby tiše vyrobila rozbitou hru', () => {
    expect(() => sestavaPro(4)).toThrow();
    expect(() => sestavaPro(13)).toThrow();
  });

  it('nikdy nepošle na šichtu celý živý stůl', () => {
    for (let zivych = 2; zivych <= 12; zivych++) {
      expect(velikostParty(zivych)).toBeLessThan(zivych);
      expect(velikostParty(zivych)).toBeGreaterThan(0);
    }
  });
});

describe('šatna', () => {
  it('nepustí víc hráčů, než hra unese', () => {
    let s = sesli(MAX_HRACU);
    s = posli(s, { typ: 'PRIDAT_HRACE', id: 'navic', jmeno: 'Navíc' });
    expect(s.hraci).toHaveLength(MAX_HRACU);
  });

  it('nezačne s málo lidmi', () => {
    const s = reducer(sesli(4), { typ: 'ZACIT' }, 1);
    expect(s.faze).toBe('satna');
  });

  it('prvního příchozího označí za zakladatele', () => {
    expect(sesli(6).hraci[0]!.zakladatel).toBe(true);
    expect(sesli(6).hraci[1]!.zakladatel).toBe(false);
  });

  it('dvě stejné přezdívky rozliší, ať se soupiska nerozbije', () => {
    let s = prazdnyStav();
    s = posli(s, { typ: 'PRIDAT_HRACE', id: 'a', jmeno: 'MISTR' });
    s = posli(s, { typ: 'PRIDAT_HRACE', id: 'b', jmeno: 'mistr' });
    s = posli(s, { typ: 'PRIDAT_HRACE', id: 'c', jmeno: 'MISTR' });
    const jmena = s.hraci.map((h) => h.jmeno);
    expect(new Set(jmena).size).toBe(3);
    expect(jmena[0]).toBe('MISTR');
    for (const j of jmena) expect(j.length).toBeLessThanOrEqual(12);
  });

  it('kdo v šatně vypadl a nevrátil se, s hrou nezačne', () => {
    let s = sesli(7);
    s = posli(s, { typ: 'ODPOJIL_SE', id: 'h3' });
    expect(s.pauza).toBeNull();
    s = posli(s, { typ: 'ZACIT', seed: 5 }, 5);
    expect(s.faze).toBe('rozdani');
    expect(s.hraci.map((h) => h.id)).not.toContain('h3');
    expect(s.hraci).toHaveLength(6);
  });

  it('když zakladatel v šatně zmizí, převezme to první připojený', () => {
    let s = sesli(6);
    s = posli(s, { typ: 'ODPOJIL_SE', id: 'h0' });
    expect(s.hraci.find((h) => h.zakladatel)?.id).toBe('h1');
    s = posli(s, { typ: 'ODEBRAT_HRACE', id: 'h1' });
    expect(s.hraci.find((h) => h.zakladatel)?.id).toBe('h2');
  });
});

describe('rozdání rolí', () => {
  it('rozdá přesně tolik sabotérů, kolik říká sestava', () => {
    for (let n = MIN_HRACU; n <= MAX_HRACU; n++) {
      const s = rozehrat(n);
      expect(ziviSaboteri(s)).toHaveLength(sestavaPro(n).saboteri);
      expect(ziviPracanti(s)).toHaveLength(n - sestavaPro(n).saboteri);
    }
  });

  it('předák je vždy jeden ze sabotérů', () => {
    const s = rozehrat(8);
    expect(s.role[s.predak!]).toBe('saboter');
  });

  it('stejný seed dá stejné rozdání', () => {
    expect(rozehrat(8, 123).role).toEqual(rozehrat(8, 123).role);
  });

  it('různé seedy dají různá rozdání, jinak by role záležely na pořadí příchodu', () => {
    const rozdani = new Set<string>();
    for (let seed = 1; seed <= 20; seed++) {
      const s = reducer(sesli(6), { typ: 'ZACIT' }, seed * 7919);
      rozdani.add(s.hraci.filter((h) => s.role[h.id] === 'saboter').map((h) => h.id).join(','));
    }
    expect(rozdani.size).toBeGreaterThanOrEqual(8);
  });

  it('identifikátor partie ze startu se uloží', () => {
    const s = reducer(sesli(6), { typ: 'ZACIT', partie: 'abc' }, 3);
    expect(s.partie).toBe('abc');
  });
});

describe('sabotáž', () => {
  it('pracant nemůže kazit, ani když se o to pokusí', () => {
    let s = dal(rozehrat(6));
    while (s.faze !== 'sichta') s = dal(s);
    const parta = posledniSmena(s.aktualni!)!.parta;
    const pracant = parta.find((id) => s.role[id] === 'pracant');
    if (!pracant) return;
    expect(smiKazit(s, pracant)).toBe(false);
    s = posli(s, { typ: 'VOLBA_SICHTY', id: pracant, volba: 'kazit' });
    expect(posledniSmena(s.aktualni!)!.volby[pracant]).toBe('makat');
  });

  it('šichta padne, jen když někdo doopravdy kazil', () => {
    let s = dal(rozehrat(6));
    while (s.faze !== 'sichta') s = dal(s);
    const parta = posledniSmena(s.aktualni!)!.parta;
    for (const id of parta) s = posli(s, { typ: 'VOLBA_SICHTY', id, volba: 'makat' });
    s = dal(s);
    expect(posledniSmena(s.aktualni!)!.padla).toBe(false);
    expect(posledniSmena(s.aktualni!)!.sabotazi).toBe(0);
  });

  it('kdo nebyl v partě, do šichty nezasáhne', () => {
    let s = dal(rozehrat(6));
    while (s.faze !== 'sichta') s = dal(s);
    const parta = posledniSmena(s.aktualni!)!.parta;
    const mimo = zivi(s).map((h) => h.id).find((id) => !parta.includes(id))!;
    const pred = posledniSmena(s.aktualni!)!.volby;
    s = posli(s, { typ: 'VOLBA_SICHTY', id: mimo, volba: 'kazit' });
    expect(posledniSmena(s.aktualni!)!.volby).toEqual(pred);
  });

  it('dvě směny za kolo zůstávají funkční, i když je žádná sestava nepoužívá', () => {
    let s: Stav = { ...rozehrat(9, 4), smenyNaKolo: 2 };
    for (const h of s.hraci) s = posli(s, { typ: 'PRIPRAVEN', id: h.id }, 4);
    while (s.faze !== 'sichta') s = dal(s, 4);
    expect(posledniSmena(s.aktualni!)!.smena).toBe('dopoledni');
    for (const id of posledniSmena(s.aktualni!)!.parta) s = posli(s, { typ: 'VOLBA_SICHTY', id, volba: 'makat' }, 4);
    s = dal(s, 4); // výsledek
    s = dal(s, 4); // zadání odpolední
    expect(s.faze).toBe('zadani');
    expect(s.aktualni!.smeny).toHaveLength(2);
    expect(posledniSmena(s.aktualni!)!.smena).toBe('odpoledni');
  });
});

/** Najde seed, u kterého sabotéři dostanou šanci kazit, a dojede do noci. */
function doNoci(pocet = 7): Stav {
  for (let seed = 1; seed < 60; seed++) {
    const s = doFaze(pocet, 'noc', { seed });
    if (s.faze === 'noc' && posledniSmena(s.aktualni!)!.padla) return s;
  }
  throw new Error('nenašel se seed s padlou šichtou');
}

describe('odměny za padlou šichtu', () => {
  it('bez padlé šichty není co si brát', () => {
    let s = dal(rozehrat(6));
    while (s.faze !== 'sichta') s = dal(s);
    for (const id of posledniSmena(s.aktualni!)!.parta) s = posli(s, { typ: 'VOLBA_SICHTY', id, volba: 'makat' });
    s = dal(s);
    expect(dostupneOdmeny(s)).toEqual([]);
  });

  it('po padlé šichtě jsou na výběr všechny tři', () => {
    const s = doNoci();
    expect(dostupneOdmeny(s)).toEqual(['vrazda', 'imunita', 'tma']);
  });

  it('vraždit dvě kola po sobě nejde', () => {
    const s = doNoci();
    const poVrazde: Stav = { ...s, vrazdaMinuleKolo: true };
    expect(dostupneOdmeny(poVrazde)).toEqual(['imunita', 'tma']);
  });

  it('prošlá šichta mezi dvěma vraždami cooldown zruší', () => {
    let s = doNoci();
    s = posli(s, { typ: 'VYBRAT_ODMENU', odmena: 'vrazda' });
    s = posli(s, { typ: 'PREDAK_ROZHODL', cil: ziviPracanti(s)[0]!.id });
    s = dal(s);
    expect(s.vrazdaMinuleKolo).toBe(true);
    // další kolo projde bez sabotáže
    s = dal(s); // předěl
    for (let i = 0; i < 20 && s.faze !== 'vyhosteni'; i++) {
      if (s.faze === 'sichta') for (const id of posledniSmena(s.aktualni!)!.parta) s = posli(s, { typ: 'VOLBA_SICHTY', id, volba: 'makat' });
      if (s.faze === 'nominace') for (const h of zivi(s)) s = posli(s, { typ: 'NENOMINUJU', id: h.id });
      s = dal(s);
    }
    s = dal(s); // bez noci rovnou do dalšího kola
    expect(s.vrazdaMinuleKolo).toBe(false);
  });

  it('imunita potřebuje jméno a chrání ho v nejbližší radě', () => {
    let s = doNoci();
    const bezJmena = posli(s, { typ: 'VYBRAT_ODMENU', odmena: 'imunita' });
    expect(bezJmena.aktualni!.odmena).toBeNull();

    const chraneny = ziviPracanti(s)[0]!.id;
    s = posli(s, { typ: 'VYBRAT_ODMENU', odmena: 'imunita', cil: chraneny });
    expect(s.imunita).toBe(chraneny);
    s = dal(s); // ráno
    s = dal(s); // předěl dalšího kola
    expect(s.imunita, 'imunita musí přežít do dalšího kola').toBe(chraneny);

    while (s.faze !== 'nominace') {
      if (s.faze === 'sichta') for (const id of posledniSmena(s.aktualni!)!.parta) s = posli(s, { typ: 'VOLBA_SICHTY', id, volba: 'makat' });
      s = dal(s);
    }
    for (const h of zivi(s)) if (h.id !== chraneny) s = posli(s, { typ: 'NOMINOVAT', id: h.id, cil: chraneny });
    s = dal(s);
    expect(s.aktualni!.kandidati).not.toContain(chraneny);
    expect(s.aktualni!.imunni).toBe(chraneny);
    expect(s.imunita, 'po sestavení rady je imunita spotřebovaná').toBeNull();
  });

  it('tma zakryje hlasy nejbližší rady a pak zmizí', () => {
    let s = doNoci();
    s = posli(s, { typ: 'VYBRAT_ODMENU', odmena: 'tma' });
    expect(s.tmaPristiRady).toBe(true);
    s = dal(s);
    s = dal(s);
    expect(s.tmaPristiRady, 'tma musí přežít do dalšího kola').toBe(true);
    while (s.faze !== 'hlasy') {
      if (s.faze === 'sichta') for (const id of posledniSmena(s.aktualni!)!.parta) s = posli(s, { typ: 'VOLBA_SICHTY', id, volba: 'makat' });
      if (s.faze === 'nominace') for (const h of zivi(s)) s = posli(s, { typ: 'NOMINOVAT', id: h.id, cil: zivi(s).find((x) => x.id !== h.id)!.id });
      if (s.faze === 'rada') for (const h of zivi(s)) s = posli(s, { typ: 'HLASOVAT', id: h.id, cil: s.aktualni!.kandidati[0]! });
      s = dal(s);
    }
    expect(s.aktualni!.tma).toBe(true);
    expect(s.tmaPristiRady).toBe(false);
    expect(pohledPro(s, 'h0').stul.hlasy).toEqual([]);
    expect(pohledPro(s, 'h0').stul.tma).toBe(true);
  });

  it('návrhy oběti smí dávat jen živí sabotéři a jen na živé pracanty', () => {
    let s = doNoci();
    const sab = ziviSaboteri(s)[0]!.id;
    const prac = ziviPracanti(s)[0]!.id;
    s = posli(s, { typ: 'NAVRHNOUT_OBET', id: prac, cil: ziviPracanti(s)[1]!.id });
    expect(s.aktualni!.navrhyObeti).toEqual({});
    s = posli(s, { typ: 'NAVRHNOUT_OBET', id: sab, cil: prac });
    expect(s.aktualni!.navrhyObeti[sab]).toBe(prac);
    const mrtvy: Stav = { ...s, hraci: s.hraci.map((h) => (h.id === sab ? { ...h, zivy: false } : h)) };
    expect(posli(mrtvy, { typ: 'NAVRHNOUT_OBET', id: sab, cil: ziviPracanti(s)[1]!.id }).aktualni!.navrhyObeti[sab]).toBe(prac);
  });
});

describe('předák', () => {
  it('po vyhoštění předáka přejde funkce na dalšího živého sabotéra', () => {
    let s = rozehrat(8);
    const predak = s.predak!;
    s = { ...s, faze: 'rada', aktualni: { ...noveKolo(1), kandidati: [predak, 'h0'] } };
    for (const h of zivi(s)) s = posli(s, { typ: 'HLASOVAT', id: h.id, cil: predak });
    s = dal(s);
    expect(s.hraci.find((h) => h.id === predak)!.zivy).toBe(false);
    expect(s.predak).not.toBe(predak);
    expect(s.role[s.predak!]).toBe('saboter');
    expect(s.hraci.find((h) => h.id === s.predak)!.zivy).toBe(true);
    expect(pohledPro(s, predak).ja.jsemPredak).toBe(false);
    expect(pohledPro(s, s.predak!).ja.jsemPredak).toBe(true);
  });

  it('předák je v noci mezi odevzdanými, jakmile rozhodne', () => {
    let s = doNoci();
    expect(kdoOdevzdal(s)).not.toContain(s.predak);
    s = posli(s, { typ: 'VYBRAT_ODMENU', odmena: 'vrazda' });
    expect(kdoOdevzdal(s), 'vražda bez oběti není hotová').not.toContain(s.predak);
    s = posli(s, { typ: 'PREDAK_ROZHODL', cil: ziviPracanti(s)[0]!.id });
    expect(kdoOdevzdal(s)).toContain(s.predak);
    const t = posli(doNoci(), { typ: 'VYBRAT_ODMENU', odmena: 'tma' });
    expect(kdoOdevzdal(t)).toContain(t.predak);
  });
});

describe('rada', () => {
  it('při rovnosti hlasů neodchází nikdo', () => {
    let s = rozehrat(6);
    s = { ...s, faze: 'rada', aktualni: { ...noveKolo(1), kandidati: ['h1', 'h2'] } };
    s = posli(s, { typ: 'HLASOVAT', id: 'h0', cil: 'h1' });
    s = posli(s, { typ: 'HLASOVAT', id: 'h3', cil: 'h2' });
    s = dal(s);
    expect(s.aktualni!.vyhosteny).toBeNull();
    expect(zivi(s)).toHaveLength(6);
  });

  it('kdo má víc hlasů, odchází', () => {
    let s = rozehrat(6);
    s = { ...s, faze: 'rada', aktualni: { ...noveKolo(1), kandidati: ['h1', 'h2'] } };
    for (const id of ['h0', 'h3', 'h4']) s = posli(s, { typ: 'HLASOVAT', id, cil: 'h1' });
    s = posli(s, { typ: 'HLASOVAT', id: 'h5', cil: 'h2' });
    s = dal(s);
    expect(s.aktualni!.vyhosteny).toBe('h1');
    expect(zivi(s).map((h) => h.id)).not.toContain('h1');
  });

  it('jediný hlas nikoho nevyhostí', () => {
    let s = rozehrat(6);
    s = { ...s, faze: 'rada', aktualni: { ...noveKolo(1), kandidati: ['h1'] } };
    s = posli(s, { typ: 'HLASOVAT', id: 'h0', cil: 'h1' });
    s = dal(s);
    expect(s.aktualni!.vyhosteny).toBeNull();
  });

  it('bez nadpoloviční většiny odevzdaných hlasů nikdo neodchází', () => {
    let s = rozehrat(8);
    s = { ...s, faze: 'rada', aktualni: { ...noveKolo(1), kandidati: ['h1', 'h2', 'h3'] } };
    for (const id of ['h0', 'h4']) s = posli(s, { typ: 'HLASOVAT', id, cil: 'h1' });
    s = posli(s, { typ: 'HLASOVAT', id: 'h5', cil: 'h2' });
    s = posli(s, { typ: 'HLASOVAT', id: 'h6', cil: 'h3' });
    s = posli(s, { typ: 'HLASOVAT', id: 'h7', cil: 'h3' });
    s = dal(s);
    expect(s.aktualni!.vyhosteny).toBeNull();
  });

  it('nejde hlasovat pro někoho, kdo není kandidát', () => {
    let s = rozehrat(6);
    s = { ...s, faze: 'rada', aktualni: { ...noveKolo(1), kandidati: ['h1', 'h2'] } };
    s = posli(s, { typ: 'HLASOVAT', id: 'h0', cil: 'h5' });
    expect(s.aktualni!.hlasy).toEqual({});
  });

  it('poslední slovo dostane každý kandidát zvlášť', () => {
    let s = rozehrat(8);
    s = { ...s, faze: 'kandidati', aktualni: { ...noveKolo(1), kandidati: ['h1', 'h2', 'h3'] } };
    s = dal(s);
    expect(s.faze).toBe('posledni_slovo');
    expect(s.aktualni!.mluvi).toBe(0);
    s = dal(s);
    expect(s.faze).toBe('posledni_slovo');
    expect(s.aktualni!.mluvi).toBe(1);
    s = dal(s);
    expect(s.aktualni!.mluvi).toBe(2);
    s = dal(s);
    expect(s.faze).toBe('rada');
  });
});

describe('hlas stínu', () => {
  it('stín má jeden hlas a po použití je pryč', () => {
    let s = rozehrat(6);
    s = { ...s, hraci: s.hraci.map((h) => (h.id === 'h4' ? { ...h, zivy: false } : h)) };
    s = { ...s, faze: 'rada', aktualni: { ...noveKolo(1), kandidati: ['h1', 'h2'] } };

    s = posli(s, { typ: 'HLASOVAT', id: 'h4', cil: 'h1' });
    expect(s.aktualni!.hlasyStinu['h4']).toBe('h1');
    expect(s.aktualni!.hlasy['h4']).toBeUndefined();

    s = posli(s, { typ: 'HLASOVAT', id: 'h0', cil: 'h1' });
    s = dal(s);
    expect(s.hraci.find((h) => h.id === 'h4')!.hlasStinuUtracen).toBe(true);

    // podruhé už neprojde
    let znovu: Stav = { ...s, faze: 'rada', aktualni: { ...noveKolo(2), kandidati: ['h2', 'h3'] } };
    znovu = posli(znovu, { typ: 'HLASOVAT', id: 'h4', cil: 'h2' });
    expect(znovu.aktualni!.hlasyStinu['h4']).toBeUndefined();
  });

  it('hlas stínu se utratí použitím, i když rada skončí remízou', () => {
    let s = rozehrat(6);
    s = { ...s, hraci: s.hraci.map((h) => (h.id === 'h4' ? { ...h, zivy: false } : h)) };
    s = { ...s, faze: 'rada', aktualni: { ...noveKolo(1), kandidati: ['h1', 'h2'] } };
    s = posli(s, { typ: 'HLASOVAT', id: 'h4', cil: 'h1' });
    s = posli(s, { typ: 'HLASOVAT', id: 'h0', cil: 'h2' });
    s = dal(s);
    expect(s.aktualni!.vyhosteny).toBeNull();
    expect(s.hraci.find((h) => h.id === 'h4')!.hlasStinuUtracen).toBe(true);
  });
});

describe('konec hry', () => {
  it('pracanti vyhrajou, když padne poslední sabotér', () => {
    let s = rozehrat(6);
    const saboteri = ziviSaboteri(s).map((h) => h.id);
    for (const id of saboteri) s = { ...s, hraci: s.hraci.map((h) => (h.id === id ? { ...h, zivy: false } : h)) };
    s = { ...s, faze: 'vyhosteni' };
    s = dal(s);
    expect(s.faze).toBe('konec');
    expect(s.vitez).toBe('pracanti');
  });

  it('sabotéři vyhrajou, když dojdou šichty', () => {
    let s = rozehrat(6);
    s = { ...s, kolo: s.limitSicht, faze: 'rano', vrazdaMinuleKolo: false };
    s = dal(s);
    expect(s.faze).toBe('konec');
    expect(s.vitez).toBe('saboteri');
    expect(s.duvodKonce).toContain('šichty');
  });

  it('sabotéři vyhrajou, když nezbyde pracant', () => {
    let s = rozehrat(6);
    for (const h of ziviPracanti(s)) s = { ...s, hraci: s.hraci.map((x) => (x.id === h.id ? { ...x, zivy: false } : x)) };
    s = dal({ ...s, faze: 'vyhosteni' });
    expect(s.vitez).toBe('saboteri');
  });

  it('znovu vrátí stejnou partu do šatny s čistým stavem', () => {
    let s = rozehrat(6);
    s = { ...s, faze: 'konec', vitez: 'pracanti', hraci: s.hraci.map((h, i) => (i < 2 ? { ...h, zivy: false, hlasStinuUtracen: true } : h)) };
    s = posli(s, { typ: 'ZNOVU' });
    expect(s.faze).toBe('satna');
    expect(s.hraci).toHaveLength(6);
    expect(s.hraci.every((h) => h.zivy && !h.hlasStinuUtracen)).toBe(true);
    expect(s.role).toEqual({});
    expect(s.historie).toEqual([]);
    expect(s.hraci.filter((h) => h.zakladatel)).toHaveLength(1);
  });
});

describe('pauza při odpojení', () => {
  it('odpojení hráče, na kterého se čeká, zastaví postup fází', () => {
    let s = doFaze(7, 'nominace');
    expect(s.faze).toBe('nominace');
    s = posli(s, { typ: 'ODPOJIL_SE', id: 'h2' });
    expect(s.pauza?.kvuli).toBe('h2');
    expect(dal(s).faze).toBe('nominace');
  });

  it('odpojení tam, kde se nic neodevzdává, hru nezastaví', () => {
    let s = dal(rozehrat(6));
    expect(s.faze).toBe('predel');
    s = posli(s, { typ: 'ODPOJIL_SE', id: 'h2' });
    expect(s.pauza).toBeNull();
    expect(s.hraci.find((h) => h.id === 'h2')!.pripojeny).toBe(false);
    const r = doFaze(7, 'rozprava', { kazi: false });
    expect(r.faze).toBe('rozprava');
    expect(posli(r, { typ: 'ODPOJIL_SE', id: 'h1' }).pauza).toBeNull();
  });

  it('kdo už odevzdal, pauzu nedrží', () => {
    let s = doFaze(7, 'nominace');
    s = posli(s, { typ: 'NENOMINUJU', id: 'h2' });
    s = posli(s, { typ: 'ODPOJIL_SE', id: 'h2' });
    expect(s.pauza).toBeNull();
  });

  it('návrat pauzu zruší', () => {
    let s = doFaze(7, 'nominace');
    s = posli(s, { typ: 'ODPOJIL_SE', id: 'h2' });
    s = posli(s, { typ: 'PRIPOJIL_SE', id: 'h2' });
    expect(s.pauza).toBeNull();
  });

  it('když vypadnou dva, pauza přejde na druhého, až se první vrátí', () => {
    let s = doFaze(7, 'nominace');
    s = posli(s, { typ: 'ODPOJIL_SE', id: 'h2' });
    s = posli(s, { typ: 'ODPOJIL_SE', id: 'h4' });
    expect(s.pauza?.kvuli).toBe('h2');
    s = posli(s, { typ: 'PRIPOJIL_SE', id: 'h2' });
    expect(s.pauza?.kvuli).toBe('h4');
  });

  it('zakladatel může hrát bez odpojeného a fáze na něj přestane čekat', () => {
    let s = doFaze(7, 'nominace');
    s = posli(s, { typ: 'ODPOJIL_SE', id: 'h2' });
    s = posli(s, { typ: 'HRAT_BEZ_NEJ', id: 'h2' });
    expect(s.pauza).toBeNull();
    for (const h of zivi(s)) if (h.id !== 'h2') s = posli(s, { typ: 'NENOMINUJU', id: h.id });
    expect(fazeHotova(s)).toBe(true);
    // návrat hráče zase začne počítat
    s = posli(s, { typ: 'PRIPOJIL_SE', id: 'h2' });
    expect(fazeHotova(s)).toBe(false);
  });

  it('rozdání rolí nečeká na toho, bez koho se hraje', () => {
    let s = rozehrat(6);
    s = posli(s, { typ: 'ODPOJIL_SE', id: 'h5' });
    expect(s.pauza?.kvuli).toBe('h5');
    s = posli(s, { typ: 'HRAT_BEZ_NEJ', id: 'h5' });
    for (const h of s.hraci.slice(0, 5)) s = posli(s, { typ: 'PRIPRAVEN', id: h.id });
    expect(s.faze).toBe('predel');
  });
});

describe('fáze končí, když odevzdali všichni', () => {
  it('šichta: celá parta', () => {
    let s = doFaze(7, 'sichta');
    expect(fazeHotova(s)).toBe(false);
    for (const id of posledniSmena(s.aktualni!)!.parta) s = posli(s, { typ: 'VOLBA_SICHTY', id, volba: 'makat' });
    expect(fazeHotova(s)).toBe(true);
  });

  it('rada: živí i stíny s hlasem, zdržení se počítá', () => {
    let s = rozehrat(7);
    s = { ...s, hraci: s.hraci.map((h) => (h.id === 'h6' ? { ...h, zivy: false } : h)) };
    s = { ...s, faze: 'rada', aktualni: { ...noveKolo(1), kandidati: ['h1', 'h2'] } };
    for (const h of zivi(s)) s = posli(s, { typ: 'HLASOVAT', id: h.id, cil: 'h1' });
    expect(fazeHotova(s), 'stín s hlasem ještě nic neřekl').toBe(false);
    s = posli(s, { typ: 'ZDRZUJU_SE', id: 'h6' });
    expect(fazeHotova(s)).toBe(true);
  });

  it('noc: pracanti tip, sabotéři návrh, předák rozhodnutí', () => {
    let s = doNoci();
    for (const h of ziviPracanti(s)) s = posli(s, { typ: 'ZAPSAT_PODEZRELEHO', id: h.id, cil: zivi(s).find((x) => x.id !== h.id)!.id });
    for (const h of ziviSaboteri(s)) if (h.id !== s.predak) s = posli(s, { typ: 'NAVRHNOUT_OBET', id: h.id, cil: ziviPracanti(s)[0]!.id });
    expect(fazeHotova(s), 'předák ještě nevybral').toBe(false);
    s = posli(s, { typ: 'VYBRAT_ODMENU', odmena: 'vrazda' });
    expect(fazeHotova(s), 'vražda bez oběti').toBe(false);
    s = posli(s, { typ: 'PREDAK_ROZHODL', cil: ziviPracanti(s)[0]!.id });
    expect(fazeHotova(s)).toBe(true);
  });

  it('rozprava a výsledek nikdy hotové nejsou, tam rozhoduje čas', () => {
    expect(fazeHotova(doFaze(7, 'rozprava', { kazi: false }))).toBe(false);
    expect(fazeHotova(doFaze(7, 'vysledek'))).toBe(false);
  });
});

describe('celá partie doběhne', () => {
  it('od pěti do dvanácti hráčů vždy skončí vítězstvím', () => {
    for (let n = MIN_HRACU; n <= MAX_HRACU; n++) {
      for (const seed of [1, 7, 42, 1337]) {
        let s = rozehrat(n, seed);
        let kroku = 0;
        while (s.faze !== 'konec' && kroku < 2000) {
          kroku++;
          if (s.faze === 'sichta') {
            for (const id of posledniSmena(s.aktualni!)!.parta) {
              s = posli(s, { typ: 'VOLBA_SICHTY', id, volba: s.role[id] === 'saboter' ? 'kazit' : 'makat' }, seed);
            }
          }
          if (s.faze === 'nominace') {
            const ziviIds = zivi(s).map((h) => h.id);
            for (const id of ziviIds) {
              const cil = ziviIds.find((x) => x !== id);
              if (cil) s = posli(s, { typ: 'NOMINOVAT', id, cil }, seed);
            }
          }
          if (s.faze === 'rada') {
            for (const h of zivi(s)) {
              const cil = s.aktualni!.kandidati[0];
              if (cil) s = posli(s, { typ: 'HLASOVAT', id: h.id, cil }, seed);
            }
          }
          if (s.faze === 'noc') {
            const odmeny = dostupneOdmeny(s);
            if (odmeny.includes('vrazda')) {
              s = posli(s, { typ: 'VYBRAT_ODMENU', odmena: 'vrazda' }, seed);
              const obet = ziviPracanti(s)[0];
              if (obet) s = posli(s, { typ: 'PREDAK_ROZHODL', cil: obet.id }, seed);
            } else if (odmeny.length > 0) {
              s = posli(s, { typ: 'VYBRAT_ODMENU', odmena: 'imunita', cil: ziviPracanti(s)[0]!.id }, seed);
            }
          }
          s = dal(s, seed);
        }
        expect(s.faze, `${n} hráčů, seed ${seed}`).toBe('konec');
        expect(s.vitez, `${n} hráčů, seed ${seed}`).not.toBeNull();
      }
    }
  });
});

describe('připravenost před startem', () => {
  it('hra nezačne, dokud se nepodívají všichni', () => {
    let s = rozehrat(6);
    expect(s.faze).toBe('rozdani');

    for (const h of s.hraci.slice(0, 5)) {
      s = posli(s, { typ: 'PRIPRAVEN', id: h.id });
      expect(s.faze, `po ${h.jmeno}`).toBe('rozdani');
    }

    s = posli(s, { typ: 'PRIPRAVEN', id: s.hraci[5]!.id });
    expect(s.faze).not.toBe('rozdani');
    expect(s.kolo).toBe(1);
  });

  it('dvojí potvrzení od jednoho hráče hru nerozjede', () => {
    let s = rozehrat(6);
    for (let i = 0; i < 8; i++) s = posli(s, { typ: 'PRIPRAVEN', id: 'h0' });
    expect(s.pripraveni).toEqual(['h0']);
    expect(s.faze).toBe('rozdani');
  });

  it('cizí id se zahodí', () => {
    let s = rozehrat(6);
    s = posli(s, { typ: 'PRIPRAVEN', id: 'nekdo-cizi' });
    expect(s.pripraveni).toEqual([]);
  });
});

describe('zkrácení rozpravy hlasováním', () => {
  it('menšina rozpravu neutne', () => {
    const s = doFaze(7, 'rozprava', { kazi: false });
    expect(s.faze).toBe('rozprava');
    let x = s;
    for (const h of zivi(s).slice(0, 3)) x = posli(x, { typ: 'CHCI_DAL', id: h.id });
    expect(x.aktualni?.chtejiDal).toHaveLength(3);
    expect(x.faze).toBe('rozprava');
  });

  it('nadpoloviční většina živých ji utne', () => {
    const s = doFaze(7, 'rozprava', { kazi: false });
    let x = s;
    for (const h of zivi(s).slice(0, 4)) x = posli(x, { typ: 'CHCI_DAL', id: h.id });
    expect(x.faze).toBe('nominace');
  });

  it('rozmyslet si to jde, dokud většina nepadne', () => {
    const s = doFaze(7, 'rozprava', { kazi: false });
    let x = posli(s, { typ: 'CHCI_DAL', id: 'h0' });
    expect(x.aktualni?.chtejiDal).toContain('h0');
    x = posli(x, { typ: 'CHCI_DAL', id: 'h0' });
    expect(x.aktualni?.chtejiDal).not.toContain('h0');
    expect(x.faze).toBe('rozprava');
  });

  it('mimo rozpravu se hlas nezapíše', () => {
    const s = doFaze(7, 'rozprava', { kazi: false });
    const jinde = posli(s, { typ: 'DALSI_FAZE' });
    expect(jinde.faze).not.toBe('rozprava');
    const x = posli(jinde, { typ: 'CHCI_DAL', id: 'h0' });
    expect(x.aktualni?.chtejiDal ?? []).toHaveLength(0);
  });
});

describe('nikoho nenominovat a zdržet se', () => {
  it('kdo nenominuje, je započítaný mezi odevzdané', () => {
    const s = doFaze(7, 'nominace');
    const x = posli(s, { typ: 'NENOMINUJU', id: 'h0' });
    expect(x.aktualni?.beznominace).toContain('h0');
    expect(pohledPro(x, 'h1').stul.odevzdali).toContain('h0');
  });

  it('když nenominuje nikdo, nikdo neodejde', () => {
    let s = doFaze(7, 'nominace');
    for (const h of zivi(s)) s = posli(s, { typ: 'NENOMINUJU', id: h.id });
    s = dal(s);
    expect(s.faze).toBe('vyhosteni');
    expect(s.aktualni?.vyhosteny).toBeNull();
  });

  it('nominace přebije dřívější rozhodnutí nenominovat', () => {
    const s = doFaze(7, 'nominace');
    let x = posli(s, { typ: 'NENOMINUJU', id: 'h0' });
    x = posli(x, { typ: 'NOMINOVAT', id: 'h0', cil: 'h1' });
    expect(x.aktualni?.beznominace).not.toContain('h0');
    expect(x.aktualni?.nominace['h0']).toBe('h1');
  });

  it('kdo se zdrží, je odevzdaný a nikoho tím nevyhostí', () => {
    let s = doFaze(7, 'rada');
    expect(s.aktualni?.kandidati.length).toBeGreaterThan(0);
    for (const h of zivi(s)) s = posli(s, { typ: 'ZDRZUJU_SE', id: h.id });
    expect(pohledPro(s, 'h0').stul.odevzdali.length).toBeGreaterThanOrEqual(zivi(s).length);
    s = dal(s);
    expect(s.aktualni?.vyhosteny).toBeNull();
  });

  it('stín, který se zdrží, o svůj jediný hlas nepřijde', () => {
    let s = rozehrat(7);
    s = { ...s, hraci: s.hraci.map((h) => (h.id === 'h6' ? { ...h, zivy: false } : h)) };
    s = { ...s, faze: 'rada', aktualni: { ...noveKolo(1), kandidati: ['h1', 'h2'] } };
    s = posli(s, { typ: 'ZDRZUJU_SE', id: 'h6' });
    s = dal(s);
    expect(s.hraci.find((h) => h.id === 'h6')?.hlasStinuUtracen).toBe(false);
  });
});
