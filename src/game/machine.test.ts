import { describe, expect, it } from 'vitest';
import { pohledPro } from './pohled';
import { prazdnyStav, reducer, dostupneOdmeny, smiKazit, zivi, ziviSaboteri, ziviPracanti, posledniSmena, noveKolo } from './machine';
import { sestavaPro, velikostParty, MIN_HRACU, MAX_HRACU } from './rules';
import type { Akce, Stav } from './types';

const JMENA = ['Honza', 'Petr', 'Klára', 'Tomáš', 'Martin', 'Lucie', 'Eva', 'Dan', 'Iva', 'Karel', 'Nela', 'Ota'];

function sesli(pocet: number): Stav {
  let s = prazdnyStav();
  for (let i = 0; i < pocet; i++) {
    s = reducer(s, { typ: 'PRIDAT_HRACE', id: `h${i}`, jmeno: JMENA[i]! });
  }
  return s;
}

function rozehrat(pocet: number, seed = 42): Stav {
  return reducer(sesli(pocet), { typ: 'ZACIT', seed }, seed);
}

const dal = (s: Stav, seed = 42): Stav => reducer(s, { typ: 'DALSI_FAZE' }, seed);
const posli = (s: Stav, a: Akce, seed = 42): Stav => reducer(s, a, seed);

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
    const s = reducer(sesli(4), { typ: 'ZACIT' });
    expect(s.faze).toBe('satna');
  });

  it('prvního příchozího označí za zakladatele', () => {
    expect(sesli(6).hraci[0]!.zakladatel).toBe(true);
    expect(sesli(6).hraci[1]!.zakladatel).toBe(false);
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
});

describe('odměny za padlou šichtu', () => {
  function kPadleSichte(pocet = 6): Stav {
    let s = dal(rozehrat(pocet));
    while (s.faze !== 'sichta') s = dal(s);
    for (const id of posledniSmena(s.aktualni!)!.parta) {
      s = posli(s, { typ: 'VOLBA_SICHTY', id, volba: s.role[id] === 'saboter' ? 'kazit' : 'makat' });
    }
    return dal(s);
  }

  it('bez padlé šichty není co si brát', () => {
    let s = dal(rozehrat(6));
    while (s.faze !== 'sichta') s = dal(s);
    for (const id of posledniSmena(s.aktualni!)!.parta) s = posli(s, { typ: 'VOLBA_SICHTY', id, volba: 'makat' });
    s = dal(s);
    expect(dostupneOdmeny(s)).toEqual([]);
  });

  it('po padlé šichtě jsou na výběr všechny tři', () => {
    const s = kPadleSichte();
    if (!posledniSmena(s.aktualni!)!.padla) return;
    expect(dostupneOdmeny(s)).toEqual(['vrazda', 'imunita', 'tma']);
  });

  it('vraždit dvakrát po sobě nejde', () => {
    const s = kPadleSichte();
    if (!posledniSmena(s.aktualni!)!.padla) return;
    const poVrazde: Stav = { ...s, vrazdaMinulouNoc: true };
    expect(dostupneOdmeny(poVrazde)).toEqual(['imunita', 'tma']);
    expect(dostupneOdmeny(poVrazde)).not.toContain('vrazda');
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

  it('nejde hlasovat pro někoho, kdo není kandidát', () => {
    let s = rozehrat(6);
    s = { ...s, faze: 'rada', aktualni: { ...noveKolo(1), kandidati: ['h1', 'h2'] } };
    s = posli(s, { typ: 'HLASOVAT', id: 'h0', cil: 'h5' });
    expect(s.aktualni!.hlasy).toEqual({});
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
    s = { ...s, kolo: s.limitSicht, faze: 'rano', vrazdaMinulouNoc: false };
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
});

describe('pauza při odpojení', () => {
  it('odpojení zastaví postup fází', () => {
    let s = dal(rozehrat(6));
    const pred = s.faze;
    s = posli(s, { typ: 'ODPOJIL_SE', id: 'h2' });
    expect(s.pauza).not.toBeNull();
    expect(dal(s).faze).toBe(pred);
  });

  it('návrat pauzu zruší', () => {
    let s = dal(rozehrat(6));
    s = posli(s, { typ: 'ODPOJIL_SE', id: 'h2' });
    s = posli(s, { typ: 'PRIPOJIL_SE', id: 'h2' });
    expect(s.pauza).toBeNull();
  });

  it('zakladatel může hrát bez odpojeného', () => {
    let s = dal(rozehrat(6));
    s = posli(s, { typ: 'ODPOJIL_SE', id: 'h2' });
    s = posli(s, { typ: 'HRAT_BEZ_NEJ', id: 'h2' });
    expect(s.pauza).toBeNull();
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
              s = posli(s, { typ: 'VYBRAT_ODMENU', odmena: odmeny[0]! }, seed);
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
  const doRozpravy = (pocet: number): Stav => {
    let s = prazdnyStav();
    for (let i = 0; i < pocet; i++) {
      s = posli(s, { typ: 'PRIDAT_HRACE', id: `h${i}`, jmeno: `H${i}` });
    }
    s = posli(s, { typ: 'ZACIT' });
    for (const h of s.hraci) s = posli(s, { typ: 'PRIPRAVEN', id: h.id });
    for (let i = 0; i < 30 && s.faze !== 'rozprava'; i++) s = dal(s);
    return s;
  };

  it('menšina rozpravu neutne', () => {
    const s = doRozpravy(7);
    expect(s.faze).toBe('rozprava');
    let x = s;
    for (const h of zivi(s).slice(0, 3)) x = posli(x, { typ: 'CHCI_DAL', id: h.id });
    expect(x.aktualni?.chtejiDal).toHaveLength(3);
    expect(x.faze).toBe('rozprava');
  });

  it('nadpoloviční většina živých ji utne', () => {
    const s = doRozpravy(7);
    let x = s;
    for (const h of zivi(s).slice(0, 4)) x = posli(x, { typ: 'CHCI_DAL', id: h.id });
    expect(x.faze).toBe('nominace');
  });

  it('rozmyslet si to jde, dokud většina nepadne', () => {
    const s = doRozpravy(7);
    let x = posli(s, { typ: 'CHCI_DAL', id: 'h0' });
    expect(x.aktualni?.chtejiDal).toContain('h0');
    x = posli(x, { typ: 'CHCI_DAL', id: 'h0' });
    expect(x.aktualni?.chtejiDal).not.toContain('h0');
    expect(x.faze).toBe('rozprava');
  });

  it('mimo rozpravu se hlas nezapíše', () => {
    const s = doRozpravy(7);
    const jinde = posli(s, { typ: 'DALSI_FAZE' });
    expect(jinde.faze).not.toBe('rozprava');
    const x = posli(jinde, { typ: 'CHCI_DAL', id: 'h0' });
    expect(x.aktualni?.chtejiDal ?? []).toHaveLength(0);
  });
});

describe('nikoho nenominovat a zdržet se', () => {
  const doFaze = (pocet: number, faze: string): Stav => {
    let s = prazdnyStav();
    for (let i = 0; i < pocet; i++) s = posli(s, { typ: 'PRIDAT_HRACE', id: `h${i}`, jmeno: `H${i}` });
    s = posli(s, { typ: 'ZACIT' });
    for (const h of s.hraci) s = posli(s, { typ: 'PRIPRAVEN', id: h.id });
    for (let i = 0; i < 40 && s.faze !== faze; i++) {
      if (s.faze === 'sichta') {
        const sm = s.aktualni!.smeny[s.aktualni!.smeny.length - 1]!;
        for (const id of sm.parta) s = posli(s, { typ: 'VOLBA_SICHTY', id, volba: 'kazit' });
      }
      // bez nominací se do rady nikdy nedojde, kandidáti by byli prázdní
      if (s.faze === 'nominace' && faze !== 'nominace') {
        const zivy = zivi(s);
        for (const h of zivy) s = posli(s, { typ: 'NOMINOVAT', id: h.id, cil: zivy.find((x) => x.id !== h.id)!.id });
      }
      s = dal(s);
    }
    return s;
  };

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
    expect(pohledPro(s, 'h0').stul.odevzdali.length).toBe(zivi(s).length);
    s = dal(s);
    expect(s.aktualni?.vyhosteny).toBeNull();
  });

  it('stín, který se zdrží, o svůj jediný hlas nepřijde', () => {
    let s = doFaze(7, 'rada');
    const stin = s.hraci.find((h) => !h.zivy);
    if (!stin) return;
    s = posli(s, { typ: 'ZDRZUJU_SE', id: stin.id });
    s = dal(s);
    expect(s.hraci.find((h) => h.id === stin.id)?.hlasStinuUtracen).toBe(false);
  });
});
