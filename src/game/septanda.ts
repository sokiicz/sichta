import type { HracId, Kolo, Role, Smenaz } from './types';
import { jeden, type Rng } from './random';

/**
 * Šeptanda je vždycky pravdivá a vždycky měkká. Nikdy nesmí dát důkaz,
 * jen podezření. Zakázaný tvar je "mezi A, B, C je právě jeden sabotér":
 * to je zadání logické úlohy, ne pomluva.
 */

interface Kontext {
  role: Record<HracId, Role>;
  jmeno: (id: HracId) => string;
  kolo: Kolo;
  posledniSmena: Smenaz;
  zivi: HracId[];
}

type Kandidat = { text: string; platna: (k: Kontext) => boolean; sestav: (k: Kontext, r: Rng) => string };

const saboteri = (k: Kontext) => k.zivi.filter((id) => k.role[id] === 'saboter');

const KANDIDATI: Kandidat[] = [
  {
    text: 'saboter_na_sichte',
    platna: (k) => k.posledniSmena.parta.some((id) => k.role[id] === 'saboter'),
    sestav: () => 'Aspoň jeden sabotér byl dnes v šichtě.',
  },
  {
    text: 'zadny_saboter_na_sichte',
    platna: (k) => !k.posledniSmena.parta.some((id) => k.role[id] === 'saboter'),
    sestav: () => 'Dnes v šichtě nebyl ani jeden sabotér.',
  },
  {
    text: 'saboter_hlasoval_pro',
    platna: (k) => saboteri(k).some((id) => k.kolo.hlasy[id] != null),
    sestav: (k, r) => {
      const cile = saboteri(k).map((id) => k.kolo.hlasy[id]).filter((x): x is HracId => x != null);
      return `Aspoň jeden sabotér dnes hlasoval pro vyhoštění ${k.jmeno(jeden(cile, r))}.`;
    },
  },
  {
    text: 'saboter_nominoval',
    platna: (k) => saboteri(k).some((id) => k.kolo.nominace[id] != null),
    sestav: (k, r) => {
      const cile = saboteri(k).map((id) => k.kolo.nominace[id]).filter((x): x is HracId => x != null);
      return `Aspoň jeden sabotér dnes nominoval ${k.jmeno(jeden(cile, r))}.`;
    },
  },
  {
    text: 'saboteri_hlasovali_stejne',
    platna: (k) => {
      const h = saboteri(k).map((id) => k.kolo.hlasy[id]).filter((x) => x != null);
      return h.length > 1 && h.every((x) => x === h[0]);
    },
    sestav: () => 'Všichni sabotéři dnes hlasovali stejně.',
  },
  {
    text: 'saboter_nenominoval',
    platna: (k) => saboteri(k).some((id) => k.kolo.nominace[id] == null),
    sestav: () => 'Aspoň jeden sabotér dnes nikoho nenominoval.',
  },
];

export function vybratSeptandu(k: Kontext, r: Rng, uzPouzite: string[]): { text: string; klic: string } | null {
  const mozne = KANDIDATI.filter((c) => !uzPouzite.includes(c.text) && c.platna(k));
  const zdroj = mozne.length > 0 ? mozne : KANDIDATI.filter((c) => c.platna(k));
  if (zdroj.length === 0) return null;
  const c = jeden(zdroj, r);
  return { text: c.sestav(k, r), klic: c.text };
}
