import { describe, expect, it } from 'vitest';
import { rng } from './random';
import { prazdnyStav, reducer, zivi } from './machine';
import { pohledPro } from './pohled';
import {
  jmenuje, platiTvrzeni, POCET_PRAVD, rozdatSeptandu, septandaPro, vetaZTvrzeni,
  type KontextSeptandy, type Tvrzeni,
} from './septanda';
import type { Akce, HracId, Stav } from './types';

/**
 * Šeptanda je jediná mechanika ve hře, která tvrdí něco o rolích. Kdyby jen
 * jednou zalhala, přestane se jí u stolu věřit a s ní padne půlka rozpravy.
 * Proto se netestuje pár případů, ale tisíce náhodných her, a proti nim se
 * pouští nezávislý ověřovač `platiTvrzeni`.
 */

function kontextZeStavu(s: Stav): KontextSeptandy {
  return {
    role: s.role,
    jmeno: (id) => s.hraci.find((h) => h.id === id)?.jmeno ?? '?',
    predak: s.predak,
    zivi: zivi(s).map((h) => h.id),
    pocetHracu: s.hraci.length,
    historie: s.historie,
    smeny: s.aktualni?.smeny ?? [],
    kolo: s.aktualni?.cislo ?? 0,
    proSabotery: s.nastaveni.septandaProSabotery,
  };
}

/** Odehraje celou partii náhodnými tahy a posbírá každou rozdanou šeptandu. */
function odehrat(pocetHracu: number, seed: number) {
  const r = rng(seed);
  let s = prazdnyStav();
  const posli = (a: Akce) => { s = reducer(s, a, seed); };

  for (let i = 0; i < pocetHracu; i++) posli({ typ: 'PRIDAT_HRACE', id: `h${i}`, jmeno: `Hrac${i}` });
  posli({ typ: 'ZACIT', seed });
  for (const h of s.hraci) posli({ typ: 'PRIPRAVEN', id: h.id });

  const nalezy: { stav: Stav; komu: HracId; veta: string }[] = [];
  const nahodny = (pole: HracId[]) => pole[Math.floor(r() * pole.length)]!;

  for (let krok = 0; krok < 400 && s.faze !== 'konec'; krok++) {
    const zivy = zivi(s).map((h) => h.id);
    switch (s.faze) {
      case 'sichta': {
        const sm = s.aktualni?.smeny[s.aktualni.smeny.length - 1];
        for (const id of sm?.parta ?? []) {
          posli({ typ: 'VOLBA_SICHTY', id, volba: r() < 0.4 ? 'kazit' : 'makat' });
        }
        // volba se jen zapisuje, fázi posouvá až odpočet
        posli({ typ: 'DALSI_FAZE' });
        break;
      }
      case 'septanda': {
        const pred = s;
        for (const id of zivy) {
          const veta = pohledPro(pred, id).ja.septanda;
          if (veta) nalezy.push({ stav: pred, komu: id, veta });
        }
        posli({ typ: 'DALSI_FAZE' });
        break;
      }
      case 'nominace':
        // schválně nenominují všichni: v reálné hře se nominuje málo
        for (const id of zivy) {
          if (r() < 0.45) posli({ typ: 'NOMINOVAT', id, cil: nahodny(zivy.filter((x) => x !== id)) });
        }
        posli({ typ: 'DALSI_FAZE' });
        break;
      case 'rada': {
        const kand = s.aktualni?.kandidati ?? [];
        if (kand.length > 0) for (const id of zivy) posli({ typ: 'HLASOVAT', id, cil: nahodny(kand) });
        posli({ typ: 'DALSI_FAZE' });
        break;
      }
      case 'noc': {
        if (s.predak && s.aktualni && !s.aktualni.odmena) {
          posli({ typ: 'VYBRAT_ODMENU', odmena: 'vrazda' });
        }
        const cil = nahodny(zivy);
        posli({ typ: 'PREDAK_ROZHODL', cil });
        posli({ typ: 'DALSI_FAZE' });
        break;
      }
      default:
        posli({ typ: 'DALSI_FAZE' });
    }
  }
  return nalezy;
}

describe('Šeptanda', () => {
  it('nikdy nepostaví nepravdivé tvrzení, ani v tisících her', () => {
    let vet = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const pocet = 5 + (seed % 8);
      const s = prazdnyStav();
      let stav = s;
      for (let i = 0; i < pocet; i++) {
        stav = reducer(stav, { typ: 'PRIDAT_HRACE', id: `h${i}`, jmeno: `Hrac${i}` }, seed);
      }
      stav = reducer(stav, { typ: 'ZACIT', seed }, seed);
      const k = kontextZeStavu(stav);
      const r = rng(seed * 7919);
      for (const id of k.zivi) {
        const t = septandaPro(k, id, r);
        if (t) {
          expect(platiTvrzeni(t, k), `seed ${seed}, ${JSON.stringify(t)}`).toBe(true);
          vet++;
        }
      }
    }
    expect(vet).toBeGreaterThan(1000);
  });

  it('věty z odehraných partií sedí na stav, ze kterého vznikly', () => {
    let vet = 0;
    for (let seed = 1; seed <= 40; seed++) {
      for (const { stav, veta } of odehrat(5 + (seed % 8), seed)) {
        // Věta nesmí být prázdná a nesmí zmiňovat kolo, které neproběhlo.
        expect(veta.length).toBeGreaterThan(10);
        const zmineneKolo = veta.match(/kole (\d+)/);
        if (zmineneKolo) {
          const cislo = Number(zmineneKolo[1]);
          expect(stav.historie.some((h) => h.cislo === cislo)).toBe(true);
        }
        vet++;
      }
    }
    expect(vet).toBeGreaterThan(100);
  });

  it('po první šichtě nemluví o nominacích, protože žádné neproběhly', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const nalezy = odehrat(7, seed);
      const prvni = nalezy.filter((n) => n.stav.historie.length === 0);
      for (const n of prvni) {
        expect(n.veta, `seed ${seed}`).not.toMatch(/nominoval|hlas|kole/);
      }
    }
  });

  it('každý živý hráč dostane právě jednu větu', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const nalezy = odehrat(8, seed);
      const poKolech = new Map<string, Set<HracId>>();
      for (const n of nalezy) {
        const klic = `${seed}-${n.stav.kolo}`;
        if (!poKolech.has(klic)) poKolech.set(klic, new Set());
        expect(poKolech.get(klic)!.has(n.komu)).toBe(false);
        poKolech.get(klic)!.add(n.komu);
      }
    }
  });

  it('cizí šeptanda se z pohledu nedostane ven', () => {
    let kontrol = 0;
    for (let seed = 1; seed <= 20; seed++) {
      for (const { stav, komu, veta } of odehrat(7, seed)) {
        for (const h of zivi(stav)) {
          if (h.id === komu) continue;
          const p = pohledPro(stav, h.id);
          const moje = stav.aktualni?.septanda[h.id] ?? null;

          // Dostanu přesně svou větu, ani jinou, ani žádnou navíc.
          expect(p.ja.septanda).toBe(moje);

          // Dva hráči můžou dostat shodnou větu, a to je v pořádku. Únik by
          // bylo, kdyby v mých datech byla věta, kterou já sám nedostal.
          if (veta !== moje) {
            expect(JSON.stringify(p), `seed ${seed}, ${h.id}`).not.toContain(veta);
            kontrol++;
          }
        }
      }
    }
    expect(kontrol).toBeGreaterThan(200);
  });

  it('ověřovač skutečně odmítne lež', () => {
    const k: KontextSeptandy = {
      role: { a: 'saboter', b: 'saboter', c: 'pracant' },
      jmeno: (id) => id,
      predak: 'a',
      zivi: ['a', 'b', 'c'],
      pocetHracu: 3,
      historie: [],
      smeny: [],
      kolo: 1,
      proSabotery: true,
    };
    const lzi: Tvrzeni[] = [
      { typ: 'cisty', kdo: 'a' },
      { typ: 'nejsou_vsichni', kdo: ['a', 'b'] },
      { typ: 'aspon_jeden', kdo: ['c'] },
      { typ: 'nominovalo', kolo: 1, pocet: 0 },
      { typ: 'hlas', kolo: 1, cil: 'c' },
    ];
    for (const l of lzi) expect(platiTvrzeni(l, k), JSON.stringify(l)).toBe(false);

    expect(platiTvrzeni({ typ: 'cisty', kdo: 'c' }, k)).toBe(true);
    expect(platiTvrzeni({ typ: 'nejsou_vsichni', kdo: ['a', 'c'] }, k)).toBe(true);
    expect(platiTvrzeni({ typ: 'aspon_jeden', kdo: ['b', 'c'] }, k)).toBe(true);
  });

  it('věty neskloňují jména a nemají příčestí u jmen', () => {
    const jmeno = (id: string) => ({ a: 'Bára', b: 'Tomáš' })[id] ?? id;
    const vzorky: Tvrzeni[] = [
      { typ: 'nejsou_vsichni', kdo: ['a', 'b'] },
      { typ: 'aspon_jeden', kdo: ['a', 'b'] },
      { typ: 'cisty', kdo: 'a' },
      { typ: 'nominovalo', kolo: 2, pocet: 0 },
      { typ: 'nominovalo', kolo: 2, pocet: 1 },
      { typ: 'hlas', kolo: 2, cil: 'a' },
      { typ: 'predak', kolo: 2, byl: true },
      { typ: 'tichy_saboter', kolo: 2 },
    ];
    for (const t of vzorky) {
      const v = vetaZTvrzeni(t, jmeno);
      // Jméno smí stát jen v prvním pádě, tedy přesně tak, jak ho hráč zadal.
      expect(v).not.toMatch(/BÁROU|BÁRY|BÁŘE|TOMÁŠEM|TOMÁŠE/);
      // Žádné "nominovala" navázané na jméno: přezdívky jsou mužské i ženské.
      expect(v).not.toMatch(/(BÁRA|TOMÁŠ) [a-zěščřžýáíé]+la\b/);
      expect(v.endsWith('.')).toBe(true);
      expect(v).not.toContain('—');
    }
  });
});

describe('Žádná věta není důkaz', () => {
  it('věta o hlasu jmenuje jen cíl se dvěma a víc hlasy', () => {
    for (let seed = 1; seed <= 40; seed++) {
      for (const { stav } of odehrat(5 + (seed % 8), seed)) {
        for (const t of stav.aktualni?.pravdy ?? []) {
          if (t.typ !== 'hlas') continue;
          const kolo = stav.historie.find((h) => h.cislo === t.kolo)!;
          const hlasu = [...Object.values(kolo.hlasy), ...Object.values(kolo.hlasyStinu)].filter((c) => c === t.cil).length;
          expect(hlasu, `seed ${seed}, kolo ${t.kolo}`).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });

  it('věta o předákovi padne nejvýš jednou za partii', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const nalezy = odehrat(5 + (seed % 8), seed);
      const posledni = nalezy[nalezy.length - 1]?.stav;
      if (!posledni) continue;
      const vsechna = [...posledni.historie, ...(posledni.aktualni ? [posledni.aktualni] : [])];
      const oPredakovi = vsechna.flatMap((k) => k.pravdy).filter((t) => t.typ === 'predak');
      expect(oPredakovi.length, `seed ${seed}`).toBeLessThanOrEqual(1);
    }
  });

  it('v pěti hráčích nikdy nepadne "určitě není sabotér"', () => {
    for (let seed = 1; seed <= 40; seed++) {
      for (const { veta } of odehrat(5, seed)) expect(veta, `seed ${seed}`).not.toContain('Určitě není');
    }
  });

  it('vlastní jméno se ve vlastní větě neobjeví, když je jiná pravda po ruce', () => {
    let kontrol = 0;
    for (let seed = 1; seed <= 30; seed++) {
      for (const { stav, komu, veta } of odehrat(8, seed)) {
        const pravdy = stav.aktualni?.pravdy ?? [];
        const jina = pravdy.some((t) => !jmenuje(t, komu));
        if (!jina) continue;
        const jmeno = stav.hraci.find((h) => h.id === komu)!.jmeno.toUpperCase();
        expect(veta, `seed ${seed}, ${komu}`).not.toMatch(new RegExp(`\\b${jmeno}\\b`));
        kontrol++;
      }
    }
    expect(kontrol).toBeGreaterThan(50);
  });
});

describe('Špionská varianta', () => {
  it('sabotér nedostane větu, když je vypnutá', () => {
    for (let seed = 1; seed <= 25; seed++) {
      let s = prazdnyStav();
      for (let i = 0; i < 8; i++) s = reducer(s, { typ: 'PRIDAT_HRACE', id: `h${i}`, jmeno: `H${i}` }, seed);
      s = reducer(s, { typ: 'ZMENIT_NASTAVENI', nastaveni: { septandaProSabotery: false } }, seed);
      s = reducer(s, { typ: 'ZACIT', seed }, seed);
      const k = { ...kontextZeStavu(s), proSabotery: false };
      const { vety } = rozdatSeptandu(k, rng(seed * 31));
      for (const id of k.zivi) {
        if (s.role[id] === 'saboter') expect(vety[id], `seed ${seed}`).toBeUndefined();
        else expect(vety[id], `seed ${seed}`).toBeTruthy();
      }
    }
  });

  it('zapnutá ji dá i sabotérovi, takže se nedá chytit na prázdno', () => {
    for (let seed = 1; seed <= 25; seed++) {
      let s = prazdnyStav();
      for (let i = 0; i < 8; i++) s = reducer(s, { typ: 'PRIDAT_HRACE', id: `h${i}`, jmeno: `H${i}` }, seed);
      s = reducer(s, { typ: 'ZACIT', seed }, seed);
      const k = kontextZeStavu(s);
      const { vety } = rozdatSeptandu(k, rng(seed * 31));
      for (const id of k.zivi) expect(vety[id], `seed ${seed}`).toBeTruthy();
    }
  });
});

describe('Strop tří pravd', () => {
  it('za jednu prošlou šichtu vzniknou nejvýš tři různé věty', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const nalezy = odehrat(5 + (seed % 8), seed);
      const poKolech = new Map<number, Set<string>>();
      for (const n of nalezy) {
        if (!poKolech.has(n.stav.kolo)) poKolech.set(n.stav.kolo, new Set());
        poKolech.get(n.stav.kolo)!.add(n.veta);
      }
      for (const [kolo, vety] of poKolech) {
        expect(vety.size, `seed ${seed}, kolo ${kolo}`).toBeLessThanOrEqual(POCET_PRAVD);
      }
    }
  });

  it('u velkého stolu se věty opakují, protože pravd je málo', () => {
    let shod = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const poKolech = new Map<number, string[]>();
      for (const n of odehrat(12, seed)) {
        if (!poKolech.has(n.stav.kolo)) poKolech.set(n.stav.kolo, []);
        poKolech.get(n.stav.kolo)!.push(n.veta);
      }
      for (const vety of poKolech.values()) {
        if (vety.length > new Set(vety).size) shod++;
      }
    }
    expect(shod).toBeGreaterThan(10);
  });
});
