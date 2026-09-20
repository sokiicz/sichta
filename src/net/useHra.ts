import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { prazdnyStav, reducer } from '../game/machine';
import { pohledPro, type Pohled } from '../game/pohled';
import type { Akce, HracId, Stav } from '../game/types';
import { Spojeni, type StavSite } from './klient';

/**
 * Jeden tvar dat pro obě větve.
 *
 * Hot seat i online končí u téhož: jeden Pohled pro toho, kdo má zrovna
 * telefon v ruce. Díky tomu obrazovky vůbec netuší, jestli hra běží lokálně,
 * nebo přes síť, a mapování dat existuje jen jednou.
 */

export type Rezim = 'hotseat' | 'online';

export interface Hra {
  rezim: Rezim;
  /** null, dokud hra nezačala, nebo než dorazí první zpráva ze serveru. */
  pohled: Pohled | null;
  poslat: (a: Akce) => void;
  sit: StavSite | null;
  /** Hot seat: kdo má právě držet telefon. Online vždy null. */
  naRade: HracId | null;
  /** Hot seat: surový stav pro šatnu, kde se hráči teprve sbírají. */
  hotseatStav: Stav | null;
  hotseatDal: () => void;
  hotseatHotovo: () => void;
}

const SEED = Math.floor(Math.random() * 1_000_000);

/** Fáze, kde se telefon podává dokola. Ostatní vidí celý stůl naráz. */
const S_FRONTOU: ReadonlySet<string> = new Set(['rozdani', 'septanda', 'sichta', 'nominace', 'rada', 'noc']);

function frontaProFazi(s: Stav): HracId[] {
  const zivi = s.hraci.filter((h) => h.zivy);
  switch (s.faze) {
    case 'rozdani':
      return s.hraci.map((h) => h.id);
    case 'sichta': {
      const sm = s.aktualni?.smeny[s.aktualni.smeny.length - 1];
      return sm?.parta ?? [];
    }
    case 'septanda':
      // každý má vlastní větu, takže telefon musí projít všemi
      return zivi.map((h) => h.id);
    case 'nominace':
      return zivi.map((h) => h.id);
    case 'rada':
      return [...zivi, ...s.hraci.filter((h) => !h.zivy && !h.hlasStinuUtracen)].map((h) => h.id);
    case 'noc': {
      const sab = zivi.filter((h) => s.role[h.id] === 'saboter').map((h) => h.id);
      // předák první, ať je odměna vybraná dřív, než ostatní navrhují oběť
      const serazeni = [...sab].sort((a) => (a === s.predak ? -1 : 1));
      return [...serazeni, ...zivi.filter((h) => !sab.includes(h.id)).map((h) => h.id)];
    }
    default:
      return [];
  }
}

export function useHra(rezim: Rezim, kod: string | null, jmeno: string): Hra {
  // ------------------------------------------------------------- hot seat
  const [stav, poslatLokalne] = useReducer((s: Stav, a: Akce) => reducer(s, a, SEED), prazdnyStav());
  const [fronta, setFronta] = useState<HracId[]>([]);

  useEffect(() => {
    if (rezim !== 'hotseat') return;
    setFronta(frontaProFazi(stav));
  }, [rezim, stav.faze, stav.kolo, stav.aktualni?.smeny.length]);

  const naRade = rezim === 'hotseat' ? fronta[0] ?? null : null;

  const hotseatDal = useCallback(() => poslatLokalne({ typ: 'DALSI_FAZE' }), []);

  // Posun fáze nikdy uvnitř state updateru: React ho ve StrictMode pouští
  // dvakrát a fáze by přeskočila o dvě.
  const hotseatHotovo = useCallback(() => {
    const zbytek = fronta.slice(1);
    setFronta(zbytek);
    if (zbytek.length === 0) hotseatDal();
  }, [fronta, hotseatDal]);

  // ------------------------------------------------------------- online
  const [pohledZeSite, setPohledZeSite] = useState<Pohled | null>(null);
  const [sit, setSit] = useState<StavSite | null>(null);
  const spojeni = useRef<Spojeni | null>(null);

  useEffect(() => {
    if (rezim !== 'online' || !kod) return;
    const s = new Spojeni({ kod, jmeno, onPohled: setPohledZeSite, onStav: setSit });
    spojeni.current = s;
    return () => { s.zavrit(); spojeni.current = null; };
  }, [rezim, kod, jmeno]);

  // ------------------------------------------------------------- společné
  const poslat = useCallback((a: Akce) => {
    if (rezim === 'online') spojeni.current?.poslat(a);
    else poslatLokalne(a);
  }, [rezim]);

  const pohled = useMemo<Pohled | null>(() => {
    if (rezim === 'online') return pohledZeSite;
    if (stav.faze === 'satna') return null;
    // Pohled patří tomu, kdo drží telefon. Mimo frontu je to pohled stolu,
    // takže první hráč: veřejná část je pro všechny stejně.
    const kdo = naRade ?? stav.hraci[0]?.id;
    return kdo ? pohledPro(stav, kdo) : null;
  }, [rezim, pohledZeSite, stav, naRade]);

  return {
    rezim,
    pohled,
    poslat,
    sit,
    naRade: rezim === 'hotseat' && S_FRONTOU.has(stav.faze) ? naRade : null,
    hotseatStav: rezim === 'hotseat' ? stav : null,
    hotseatDal,
    hotseatHotovo,
  };
}
