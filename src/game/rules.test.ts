import { describe, expect, it } from 'vitest';
import { prazdnyStav, reducer } from './machine';
import {
  cistaUroven, cistyPosun, delkaFaze, jeDivokaSestava, LIMIT_POSUN_MAX, LIMIT_POSUN_MIN, MAX_HRACU, MIN_HRACU,
  nasobekRozpravy, odhadPro, sestavaPro, UROVNE,
} from './rules';
import type { Uroven } from './types';

const JMENA = ['Honza', 'Petr', 'Klára', 'Tomáš', 'Martin', 'Lucie', 'Eva', 'Dan', 'Iva', 'Karel', 'Nela', 'Ota'];

function sesli(pocet: number) {
  let s = prazdnyStav();
  for (let i = 0; i < pocet; i++) s = reducer(s, { typ: 'PRIDAT_HRACE', id: `h${i}`, jmeno: JMENA[i]! }, 1);
  return s;
}

describe('úrovně stolu', () => {
  it('mají sestavu pro každý počet hráčů a stejný počet sabotérů', () => {
    for (let n = MIN_HRACU; n <= MAX_HRACU; n++) {
      const sab = sestavaPro(n, 'smiseny').saboteri;
      for (const u of UROVNE) {
        const s = sestavaPro(n, u);
        expect(s.saboteri).toBe(sab);
        expect(s.limitSicht).toBeGreaterThanOrEqual(2);
        expect(s.rozprava).toBeGreaterThan(0.4);
        expect(s.rozprava).toBeLessThanOrEqual(2);
      }
    }
  });

  it('bez uvedení úrovně platí smíšený stůl', () => {
    for (let n = MIN_HRACU; n <= MAX_HRACU; n++) expect(sestavaPro(n)).toEqual(sestavaPro(n, 'smiseny', 0));
  });

  it('nováčci dostanou aspoň tolik kol jako zkušení, když stůl vůbec rozhoduje limit', () => {
    // u malých stolů je limit nominální, hra skončí dřív; kontrola je jen na stolech, kde se projeví
    for (const n of [7, 8, 10]) {
      expect(sestavaPro(n, 'zacatecnici').limitSicht).toBeGreaterThanOrEqual(sestavaPro(n, 'zkuseni').limitSicht - 1);
    }
  });
});

describe('posun limitu', () => {
  it('posouvá limit o celá kola a drží se v rozsahu', () => {
    for (const u of UROVNE as Uroven[]) {
      for (let n = MIN_HRACU; n <= MAX_HRACU; n++) {
        const zaklad = sestavaPro(n, u, 0);
        expect(zaklad.doporucenyLimit).toBe(zaklad.limitSicht);
        expect(sestavaPro(n, u, 1).limitSicht).toBe(zaklad.limitSicht + 1);
        expect(sestavaPro(n, u, LIMIT_POSUN_MAX).limitSicht).toBe(zaklad.limitSicht + LIMIT_POSUN_MAX);
        expect(sestavaPro(n, u, -1).limitSicht).toBe(Math.max(2, zaklad.limitSicht - 1));
        expect(sestavaPro(n, u, 99).limitSicht).toBe(zaklad.limitSicht + LIMIT_POSUN_MAX);
        expect(sestavaPro(n, u, -99).limitSicht).toBe(Math.max(2, zaklad.limitSicht + LIMIT_POSUN_MIN));
        // doporučení se posunem nemění
        expect(sestavaPro(n, u, 2).doporucenyLimit).toBe(zaklad.doporucenyLimit);
      }
    }
  });

  it('limit nikdy neklesne pod dvě kola', () => {
    for (const u of UROVNE as Uroven[]) {
      for (let n = MIN_HRACU; n <= MAX_HRACU; n++) expect(sestavaPro(n, u, -5).limitSicht).toBeGreaterThanOrEqual(2);
    }
  });

  it('nesmysl ze sítě se mění na nulu nebo výchozí úroveň', () => {
    expect(cistyPosun(1.5)).toBe(0);
    expect(cistyPosun(NaN)).toBe(0);
    expect(cistyPosun('2')).toBe(0);
    expect(cistyPosun(null)).toBe(0);
    expect(cistyPosun(Infinity)).toBe(0);
    expect(cistaUroven('ahoj')).toBe('smiseny');
    expect(cistaUroven(undefined)).toBe('smiseny');
    expect(cistaUroven('zkuseni')).toBe('zkuseni');
  });
});

describe('délka rozpravy', () => {
  it('násobek mění jen rozpravu a zaokrouhluje na pět vteřin', () => {
    expect(delkaFaze('rozprava', 8)).toBe(240);
    expect(delkaFaze('rozprava', 8, 2, 0.75)).toBe(180);
    expect(delkaFaze('rozprava', 8, 2, 1.5)).toBe(360);
    expect(delkaFaze('rozprava', 5, 2, 0.75) % 5).toBe(0);
    expect(delkaFaze('noc', 8, 2, 2)).toBe(60);
    expect(delkaFaze('rada', 8, 2, 0.5)).toBe(45);
  });

  it('nasobekRozpravy bere násobek z úrovně a počtu hráčů', () => {
    for (const u of UROVNE as Uroven[]) {
      for (let n = MIN_HRACU; n <= MAX_HRACU; n++) expect(nasobekRozpravy(n, u)).toBe(sestavaPro(n, u).rozprava);
    }
  });

  it('i nejkratší rozprava má aspoň půl minuty', () => {
    expect(delkaFaze('rozprava', 5, 2, 0.01)).toBeGreaterThanOrEqual(30);
  });
});

describe('nastavení v reduceru', () => {
  it('uloží platné hodnoty a zahodí neplatné', () => {
    let s = sesli(8);
    s = reducer(s, { typ: 'ZMENIT_NASTAVENI', nastaveni: { uroven: 'zkuseni', limitPosun: 1 } }, 1);
    expect(s.nastaveni.uroven).toBe('zkuseni');
    expect(s.nastaveni.limitPosun).toBe(1);
    // poškozená zpráva neshodí partii a nepřepíše nic neplatným
    s = reducer(s, { typ: 'ZMENIT_NASTAVENI', nastaveni: { uroven: 'cokoli' as unknown as Uroven, limitPosun: 500, vrazdy: 'ano' as unknown as boolean } }, 1);
    expect(s.nastaveni.uroven).toBe('smiseny');
    expect(s.nastaveni.limitPosun).toBe(LIMIT_POSUN_MAX);
    expect(s.nastaveni.vrazdy).toBe(true);
  });

  it('nezná cizí klíče', () => {
    let s = sesli(6);
    s = reducer(s, { typ: 'ZMENIT_NASTAVENI', nastaveni: { limitSicht: 99 } as never }, 1);
    expect(s.nastaveni).not.toHaveProperty('limitSicht');
  });

  it('start partie vezme limit z úrovně a posunu', () => {
    for (const u of UROVNE as Uroven[]) {
      for (const posun of [-1, 0, 2]) {
        let s = sesli(8);
        s = reducer(s, { typ: 'ZMENIT_NASTAVENI', nastaveni: { uroven: u, limitPosun: posun } }, 1);
        s = reducer(s, { typ: 'ZACIT', seed: 7 }, 7);
        expect(s.faze).toBe('rozdani');
        expect(s.limitSicht).toBe(sestavaPro(8, u, posun).limitSicht);
        expect(s.pocetSaboteru).toBe(sestavaPro(8, u, posun).saboteri);
      }
    }
  });

  it('po rozdání rolí už se nastavení nemění', () => {
    let s = sesli(8);
    s = reducer(s, { typ: 'ZACIT', seed: 7 }, 7);
    const pred = s.nastaveni;
    s = reducer(s, { typ: 'ZMENIT_NASTAVENI', nastaveni: { uroven: 'zkuseni', limitPosun: 2 } }, 7);
    expect(s.nastaveni).toEqual(pred);
  });

  it('ZNOVU nechá nastavení stolu', () => {
    let s = sesli(8);
    s = reducer(s, { typ: 'ZMENIT_NASTAVENI', nastaveni: { uroven: 'zacatecnici', limitPosun: -1 } }, 1);
    s = reducer(s, { typ: 'ZACIT', seed: 7 }, 7);
    s = { ...s, faze: 'konec' };
    s = reducer(s, { typ: 'ZNOVU' }, 7);
    expect(s.nastaveni.uroven).toBe('zacatecnici');
    expect(s.nastaveni.limitPosun).toBe(-1);
  });
});

describe('odhady pro obrazovku nastavení', () => {
  it('jsou pro každou úroveň, velikost a posun a dávají smysl', () => {
    for (const u of UROVNE as Uroven[]) {
      for (let n = MIN_HRACU; n <= MAX_HRACU; n++) {
        for (let posun = LIMIT_POSUN_MIN; posun <= LIMIT_POSUN_MAX; posun++) {
          const o = odhadPro(n, u, posun);
          expect(o, `${u} ${n} ${posun}`).not.toBeNull();
          expect(o!.pracanti).toBeGreaterThanOrEqual(0);
          expect(o!.pracanti).toBeLessThanOrEqual(1);
          expect(o!.minut).toBeGreaterThan(5);
          expect(o!.minut).toBeLessThan(120);
        }
      }
    }
  });

  it('delší limit nesnižuje výhru pracantů o víc než šum simulace', () => {
    for (const u of UROVNE as Uroven[]) {
      for (let n = MIN_HRACU; n <= MAX_HRACU; n++) {
        for (let posun = LIMIT_POSUN_MIN; posun < LIMIT_POSUN_MAX; posun++) {
          expect(odhadPro(n, u, posun + 1)!.pracanti).toBeGreaterThanOrEqual(odhadPro(n, u, posun)!.pracanti - 0.04);
        }
      }
    }
  });

  it('pětka je pořád označená jako divoká', () => {
    expect(jeDivokaSestava(5)).toBe(true);
    expect(jeDivokaSestava(6)).toBe(false);
  });
});
