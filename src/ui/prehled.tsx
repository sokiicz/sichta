import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Popisek, Tlacitko } from './primitives';
import { zaznamenat } from './telemetrie';
import { OdkrytiRole } from '../screens/role';
import { SeznamKol, type KoloPrehled } from '../screens/konec';
import type { HracId, Role } from '../game/types';

/**
 * Přehled hry: historie šicht a připomínka vlastní role. Sedí na tlačítku
 * vlevo dole, vedle zápisníku.
 *
 * Během rozpravy je zamčený, a to schválně: kdo si chce ověřit, kdo byl na
 * druhé šichtě, musí se zeptat nahlas. Tím se historie stane předmětem
 * hádky místo soukromého čtení, viz docs/obrazovky.md.
 */

export interface DataPrehledu {
  kola: KoloPrehled[];
  role: Role | null;
  spoluSaboteri: { id: HracId; jmeno: string; predak: boolean }[];
  jsemPredak: boolean;
  pocetSaboteru: number;
}

interface Kontext {
  /** null znamená, že se přehled teď nemá nabízet vůbec. */
  data: DataPrehledu | null;
  zamceno: boolean;
}

const PrehledCtx = createContext<Kontext>({ data: null, zamceno: false });

export function PoskytniPrehled({ data, zamceno, children }: { data: DataPrehledu | null; zamceno: boolean; children: ReactNode }) {
  return <PrehledCtx.Provider value={{ data, zamceno }}>{children}</PrehledCtx.Provider>;
}

export function Prehled() {
  const { data, zamceno } = useContext(PrehledCtx);
  const [otevreno, setOtevreno] = useState(false);

  // Když se přehled zamkne nebo změní držitel telefonu, zavře se.
  useEffect(() => { if (zamceno || !data) setOtevreno(false); }, [zamceno, data === null]);

  if (!data) return null;

  if (!otevreno) {
    return (
      <button
        type="button"
        data-mereni="prehled"
        onClick={zamceno ? () => zaznamenat('prehled_zamceny') : () => { zaznamenat('prehled'); setOtevreno(true); }}
        aria-label={zamceno ? 'Přehled je během rozpravy zamčený' : 'Otevřít přehled hry'}
        aria-disabled={zamceno}
        style={{
          position: 'fixed', left: 14, bottom: 'max(14px, env(safe-area-inset-bottom))',
          height: 48, padding: '0 14px', borderRadius: 999, zIndex: 40,
          border: '3px solid var(--ram)', background: 'var(--ocel-900)',
          display: 'flex', alignItems: 'center', gap: 8,
          opacity: zamceno ? 0.45 : 1,
          boxShadow: '0 4px 14px rgba(0,0,0,0.45)',
          fontFamily: 'var(--font-nadpis)', fontSize: 13, letterSpacing: '0.14em', color: 'var(--text-akcent)',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 5h16M4 12h16M4 19h10" stroke="var(--text-akcent)" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
        {zamceno ? 'ZAMČENO' : 'PŘEHLED'}
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50, background: 'var(--ocel-900)',
        display: 'flex', flexDirection: 'column', gap: 12,
        padding: 'max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom))',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '3px solid var(--ram)', paddingBottom: 10 }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-nadpis)', fontWeight: 400, fontSize: 24, letterSpacing: '0.05em' }}>
          PŘEHLED
        </h2>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: 'var(--text-tlum)' }}>
          {data.kola.length} ŠICHT
        </span>
      </div>

      <div style={{ flexGrow: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 11 }}>
        <SeznamKol kola={data.kola} prazdne="Ještě neproběhla žádná šichta." />

        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 300 }}>
          <Popisek>TVÁ ROLE · JEN PRO TEBE</Popisek>
          <OdkrytiRole
            role={data.role} spoluSaboteri={data.spoluSaboteri}
            jsemPredak={data.jsemPredak} pocetSaboteru={data.pocetSaboteru}
          />
        </div>
      </div>

      <Tlacitko druh="hlavni" vyska={62} onClick={() => setOtevreno(false)}>ZPĚT DO HRY</Tlacitko>
    </div>
  );
}
