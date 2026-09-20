import type { HracId, Kolo, Role, Smenaz } from './types';
import { jeden, vyber, type Rng } from './random';

/**
 * Šeptanda. Za prošlou šichtu dostane **každý živý hráč vlastní větu.**
 *
 * Proč každý svou a ne jedna veřejná: veřejná hláška je jen oznámení, které
 * si všichni přečtou stejně. Vlastní věta je naopak příspěvek do rozpravy,
 * který nikdo nemůže ověřit. Sabotér si tu svou může vymyslet, pracant tu
 * svou musí obhájit, a stůl se hádá o tvrzeních, ne o faktech. Tohle je
 * druhá polovina lhaní ve hře, hned vedle tajné volby na šichtě.
 *
 * Tři pravidla, která se nesmí porušit:
 *
 * 1. **Každá věta je pravdivá.** Proto se tvrzení staví jako data (`Tvrzeni`)
 *    a teprve pak převádí na češtinu. Pravdivost ověřuje `platiTvrzeni`,
 *    které čte stav nezávisle na tom, kdo tvrzení vybral. Testy tím křížově
 *    kontrolují výběr, ne samy sebe.
 *
 * 2. **Každý dostane právě jednu větu.** Nikdo nesmí zůstat s prázdnou,
 *    protože "já nic nedostal" je u stolu okamžitě podezřelé a rozprava se
 *    zvrhne na výslech, kdo co dostal, místo na hru.
 *
 * 3. **Sabotér dostává věty ze stejného pytle jako pracant.** Kdyby měly jiný
 *    tvar, dalo by se lhaní odhalit podle stylu. Sabotérovi jsou k ničemu,
 *    protože role už zná, takže musí lhát nebo mlčet. To je záměr.
 *
 * Co se sem vědomě nedostalo: nic o tomhle kole. Šeptanda běží **před**
 * nominacemi a radou, takže tvrzení o hlasování se můžou týkat jen kol,
 * která už doběhla. Dřív to tu bylo špatně a po první šichtě to hlásilo
 * "aspoň jeden sabotér nenominoval", což byla pravda jen proto, že ještě
 * nikdo nenominoval.
 */

export type Tvrzeni =
  /** Ne všichni jmenovaní jsou sabotéři. Aspoň jeden z nich maká poctivě. */
  | { typ: 'nejsou_vsichni'; kdo: HracId[] }
  /** Mezi jmenovanými je aspoň jeden sabotér. */
  | { typ: 'aspon_jeden'; kdo: HracId[] }
  /** Jmenovaný sabotér není. Nejsilnější, co šeptanda umí. */
  | { typ: 'cisty'; kdo: HracId }
  /** Kolik sabotérů v tom kole nominovalo. */
  | { typ: 'nominovalo'; kolo: number; pocet: number }
  /** Aspoň jeden sabotér dal v tom kole hlas tomuhle jménu. */
  | { typ: 'hlas'; kolo: number; cil: HracId }
  /** Byl předák v partě na tu šichtu? */
  | { typ: 'predak'; kolo: number; byl: boolean }
  /** Prošlá šichta, ve které přesto sabotér byl. */
  | { typ: 'tichy_saboter'; kolo: number };

export interface KontextSeptandy {
  role: Record<HracId, Role>;
  jmeno: (id: HracId) => string;
  predak: HracId | null;
  zivi: HracId[];
  /** Jen dokončená kola. O probíhajícím kole se šeptanda nevyjadřuje. */
  historie: Kolo[];
  /** Šichty probíhajícího kola. Jejich výsledek už je veřejný. */
  smeny: Smenaz[];
  kolo: number;
}

// ---------------------------------------------------------------- pravda

const jeSaboter = (k: KontextSeptandy, id: HracId) => k.role[id] === 'saboter';

/**
 * Jediné místo, které rozhoduje, jestli je tvrzení pravdivé. Čte stav znovu
 * a od nuly, takže neopakuje úvahu toho, kdo tvrzení sestavil. Testy proti
 * němu prohánějí tisíce náhodných her.
 */
export function platiTvrzeni(t: Tvrzeni, k: KontextSeptandy): boolean {
  switch (t.typ) {
    case 'nejsou_vsichni':
      return t.kdo.length > 1 && t.kdo.some((id) => !jeSaboter(k, id));
    case 'aspon_jeden':
      return t.kdo.some((id) => jeSaboter(k, id));
    case 'cisty':
      return !jeSaboter(k, t.kdo);
    case 'nominovalo': {
      const kolo = k.historie.find((h) => h.cislo === t.kolo);
      if (!kolo) return false;
      const kolik = Object.keys(kolo.nominace).filter((id) => jeSaboter(k, id)).length;
      return kolik === t.pocet;
    }
    case 'hlas': {
      const kolo = k.historie.find((h) => h.cislo === t.kolo);
      if (!kolo) return false;
      return Object.entries(kolo.hlasy).some(([kdo, cil]) => jeSaboter(k, kdo) && cil === t.cil);
    }
    case 'predak': {
      const kolo = k.historie.find((h) => h.cislo === t.kolo);
      if (!kolo || !k.predak) return false;
      const byl = kolo.smeny.some((sm) => sm.parta.includes(k.predak!));
      return byl === t.byl;
    }
    case 'tichy_saboter': {
      const kolo = k.historie.find((h) => h.cislo === t.kolo);
      if (!kolo) return false;
      return kolo.smeny.some(
        (sm) => sm.padla === false && sm.parta.some((id) => jeSaboter(k, id)),
      );
    }
  }
}

// ---------------------------------------------------------------- čeština

/** Číslovky slovy: "nominovali 2 sabotéři" se u stolu nedá přečíst nahlas. */
const CISLOVKY: Record<number, string> = { 2: 'dva', 3: 'tři', 4: 'čtyři', 5: 'pět', 6: 'šest' };

/**
 * Jména hráčů jsou přezdívky, které nejdou skloňovat. Každá věta je proto
 * stavěná tak, aby jméno zůstalo v prvním pádě, typicky za dvojtečkou na
 * konci. Taky se tu nesmí objevit příčestí navázané na jméno ("nominovala"),
 * protože přezdívky jsou mužské i ženské. Podmětem je vždycky "sabotér".
 *
 * Dvojice, trojice a špinavá trojice mají schválně souměrnou stavbu, ať se
 * dají u stolu porovnávat, aniž by je někdo musel luštit.
 */
export function vetaZTvrzeni(t: Tvrzeni, jmeno: (id: HracId) => string): string {
  const seznam = (ids: HracId[]) => ids.map((id) => jmeno(id).toUpperCase()).join(', ');

  switch (t.typ) {
    case 'nejsou_vsichni':
      return t.kdo.length === 2
        ? `Aspoň jeden z téhle dvojice je pracant: ${seznam(t.kdo)}.`
        : `Aspoň jeden z téhle trojice je pracant: ${seznam(t.kdo)}.`;
    case 'aspon_jeden':
      return `Aspoň jeden z téhle trojice je sabotér: ${seznam(t.kdo)}.`;
    case 'cisty':
      return `Určitě není sabotér: ${jmeno(t.kdo).toUpperCase()}.`;
    case 'nominovalo':
      return t.pocet === 0
        ? `V kole ${t.kolo} nenominoval ani jeden sabotér.`
        : t.pocet === 1
          ? `V kole ${t.kolo} nominoval právě jeden sabotér.`
          : `V kole ${t.kolo} nominovali právě ${CISLOVKY[t.pocet] ?? t.pocet} sabotéři.`;
    case 'hlas':
      return `V kole ${t.kolo} padl hlas aspoň jednoho sabotéra na: ${jmeno(t.cil).toUpperCase()}.`;
    case 'predak':
      return t.byl
        ? `V kole ${t.kolo} byl předák v partě na šichtě.`
        : `V kole ${t.kolo} předák v partě na šichtě nebyl.`;
    case 'tichy_saboter':
      return `Šichta v kole ${t.kolo} prošla, a přesto v ní sabotér byl.`;
  }
}

// ---------------------------------------------------------------- výběr

/**
 * `vaha` řídí, jak často rodina padne. Čím vyšší číslo, tím častěji.
 * Silná tvrzení mají nízkou váhu schválně: kdyby se "sabotér to není"
 * sypalo každé kolo každému, pracanti by hru vyřešili bez jediné hádky.
 * Čísla jsou výsledek simulace, ne odhad, viz docs/design.md §9.
 */
interface Rodina {
  klic: string;
  vaha: number;
  sestav: (k: KontextSeptandy, prijemce: HracId, r: Rng) => Tvrzeni | null;
}

const ostatni = (k: KontextSeptandy, prijemce: HracId) => k.zivi.filter((id) => id !== prijemce);

const RODINY: Rodina[] = [
  {
    klic: 'dvojice',
    vaha: 4,
    sestav: (k, prijemce, r) => {
      const pracanti = ostatni(k, prijemce).filter((id) => !jeSaboter(k, id));
      if (pracanti.length === 0) return null;
      const jistota = jeden(pracanti, r);
      const zbytek = ostatni(k, prijemce).filter((id) => id !== jistota);
      if (zbytek.length === 0) return null;
      return { typ: 'nejsou_vsichni', kdo: vyber([jistota, jeden(zbytek, r)], 2, r) };
    },
  },
  {
    klic: 'trojice_cista',
    vaha: 3,
    sestav: (k, prijemce, r) => {
      const pracanti = ostatni(k, prijemce).filter((id) => !jeSaboter(k, id));
      if (pracanti.length === 0) return null;
      const jistota = jeden(pracanti, r);
      const zbytek = ostatni(k, prijemce).filter((id) => id !== jistota);
      if (zbytek.length < 2) return null;
      return { typ: 'nejsou_vsichni', kdo: vyber([jistota, ...vyber(zbytek, 2, r)], 3, r) };
    },
  },
  {
    klic: 'trojice_spinava',
    vaha: 4,
    sestav: (k, prijemce, r) => {
      const saboteri = ostatni(k, prijemce).filter((id) => jeSaboter(k, id));
      if (saboteri.length === 0) return null;
      const jistota = jeden(saboteri, r);
      const zbytek = ostatni(k, prijemce).filter((id) => id !== jistota);
      if (zbytek.length < 2) return null;
      return { typ: 'aspon_jeden', kdo: vyber([jistota, ...vyber(zbytek, 2, r)], 3, r) };
    },
  },
  {
    klic: 'cisty',
    vaha: 1,
    sestav: (k, prijemce, r) => {
      const pracanti = ostatni(k, prijemce).filter((id) => !jeSaboter(k, id));
      if (pracanti.length === 0) return null;
      return { typ: 'cisty', kdo: jeden(pracanti, r) };
    },
  },
  {
    klic: 'nominovalo',
    vaha: 3,
    sestav: (k, _prijemce, r) => {
      if (k.historie.length === 0) return null;
      const kolo = jeden(k.historie, r);
      const pocet = Object.keys(kolo.nominace).filter((id) => jeSaboter(k, id)).length;
      return { typ: 'nominovalo', kolo: kolo.cislo, pocet };
    },
  },
  {
    klic: 'hlas',
    vaha: 3,
    sestav: (k, _prijemce, r) => {
      const mozna = k.historie.filter((h) =>
        Object.keys(h.hlasy).some((id) => jeSaboter(k, id)),
      );
      if (mozna.length === 0) return null;
      const kolo = jeden(mozna, r);
      const cile = Object.entries(kolo.hlasy)
        .filter(([kdo]) => jeSaboter(k, kdo))
        .map(([, cil]) => cil);
      return { typ: 'hlas', kolo: kolo.cislo, cil: jeden(cile, r) };
    },
  },
  {
    klic: 'predak',
    vaha: 2,
    sestav: (k, _prijemce, r) => {
      if (!k.predak || k.historie.length === 0) return null;
      const kolo = jeden(k.historie, r);
      return { typ: 'predak', kolo: kolo.cislo, byl: kolo.smeny.some((sm) => sm.parta.includes(k.predak!)) };
    },
  },
  {
    klic: 'tichy_saboter',
    vaha: 3,
    sestav: (k, _prijemce, r) => {
      const mozna = k.historie.filter((h) =>
        h.smeny.some((sm) => sm.padla === false && sm.parta.some((id) => jeSaboter(k, id))),
      );
      if (mozna.length === 0) return null;
      return { typ: 'tichy_saboter', kolo: jeden(mozna, r).cislo };
    },
  },
];

function losovatRodinu(r: Rng, vyloucene: string[]): Rodina | null {
  const zdroj = RODINY.filter((x) => !vyloucene.includes(x.klic));
  if (zdroj.length === 0) return null;
  const celkem = zdroj.reduce((a, x) => a + x.vaha, 0);
  let los = r() * celkem;
  for (const x of zdroj) {
    los -= x.vaha;
    if (los <= 0) return x;
  }
  return zdroj[zdroj.length - 1]!;
}

/**
 * Jedna věta pro jednoho hráče. Losuje se rodina podle váhy, a když z ní
 * v téhle situaci nejde nic pravdivého postavit, zkusí se další. Nikdy se
 * nevrací nepravda, v nejhorším se nevrátí nic.
 */
export function septandaPro(k: KontextSeptandy, prijemce: HracId, r: Rng): Tvrzeni | null {
  const vyzkousene: string[] = [];
  for (let i = 0; i < RODINY.length; i++) {
    const rodina = losovatRodinu(r, vyzkousene);
    if (!rodina) return null;
    vyzkousene.push(rodina.klic);
    const t = rodina.sestav(k, prijemce, r);
    // Pás jistoty: co neprojde vlastní kontrolou, ven nejde, i kdyby to
    // znamenalo, že hráč tentokrát nedostane nic.
    if (t && platiTvrzeni(t, k)) return t;
  }
  return null;
}

/**
 * Kolik různých pravd se za prošlou šichtu vůbec vyrobí.
 *
 * Tohle je nejdůležitější číslo v celé šeptandě. Kdyby dostal každý hráč
 * vlastní nezávislou pravdu, roste množství informace s počtem lidí, zatímco
 * počet sabotérů ne, a u dvanácti hráčů vyhrávají pracanti tři partie ze
 * čtyř. Změřeno, viz docs/design.md §9.
 *
 * Tři pravdy rozdané mezi všechny drží informaci konstantní bez ohledu na
 * velikost stolu, a přitom nikdo nezůstane s prázdnou. Shody jsou tím pádem
 * časté, a to je záměr: dva lidi se stejnou větou se navzájem potvrzují,
 * a kdo si větu vymýšlí, hraje ruletu, jestli netrefí cizí.
 */
export const POCET_PRAVD = 3;

/** Věta pro každého živého hráče. Klíč je id hráče, hodnota hotová čeština. */
export function rozdatSeptandu(k: KontextSeptandy, r: Rng): Record<HracId, string> {
  const pravdy: string[] = [];
  const videne = new Set<string>();
  // Příjemce je tu jen zdroj náhody pro výběr rodiny, věta se pak rozdává všem.
  for (const id of vyber(k.zivi, k.zivi.length, r)) {
    if (pravdy.length >= POCET_PRAVD) break;
    const t = septandaPro(k, id, r);
    if (!t) continue;
    const veta = vetaZTvrzeni(t, k.jmeno);
    if (videne.has(veta)) continue;
    videne.add(veta);
    pravdy.push(veta);
  }
  if (pravdy.length === 0) return {};

  const ven: Record<HracId, string> = {};
  for (const id of k.zivi) ven[id] = jeden(pravdy, r);
  return ven;
}
