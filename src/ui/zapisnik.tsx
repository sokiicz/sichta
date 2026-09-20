import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * Zápisník. Každý hráč má svůj a nikdo jiný ho nevidí.
 *
 * Drží se **jen v tomhle prohlížeči**, nikdy na serveru. Jednak je to
 * soukromá poznámka a nemá důvod cestovat po síti, jednak by se tím otevřela
 * cesta, jak z pohledu vytáhnout něco cizího. Co se neposílá, nemůže uniknout.
 *
 * Na jednom telefonu se klíčuje podle toho, kdo ho zrovna drží, takže si
 * poznámky nepopletou. Po skončení hry zůstanou, dokud si je někdo nesmaže:
 * po partii se o nich ještě mluví.
 */

interface Kontext {
  /** null znamená, že se zápisník teď nemá nabízet. */
  klic: string | null;
  jmeno: string | null;
}

const ZapisnikCtx = createContext<Kontext>({ klic: null, jmeno: null });

export function PoskytniZapisnik({ kod, partie, hracId, jmeno, aktivni, children }: {
  kod: string | null; partie: string | null; hracId: string | null; jmeno: string | null;
  aktivni: boolean; children: ReactNode;
}) {
  // Partie má vlastní identifikátor, takže dvě hry na jednom telefonu si poznámky nepletou.
  const klic = aktivni && hracId ? `sichta:zapisnik:${kod ?? 'hotseat'}:${partie ?? 'bez'}:${hracId}` : null;
  return <ZapisnikCtx.Provider value={{ klic, jmeno }}>{children}</ZapisnikCtx.Provider>;
}

function precist(klic: string): string {
  try { return localStorage.getItem(klic) ?? ''; } catch { return ''; }
}

export function Zapisnik() {
  const { klic, jmeno } = useContext(ZapisnikCtx);
  const [otevreno, setOtevreno] = useState(false);
  const [text, setText] = useState('');

  // Při předání telefonu se mění klíč, takže se musí načíst poznámky toho,
  // kdo ho drží teď. A zavřít, ať se nový držitel nekouká do cizího.
  useEffect(() => {
    setOtevreno(false);
    setText(klic ? precist(klic) : '');
  }, [klic]);

  useEffect(() => {
    if (!klic || !otevreno) return;
    const t = setTimeout(() => {
      try { localStorage.setItem(klic, text); } catch { /* soukromé okno */ }
    }, 400);
    return () => clearTimeout(t);
  }, [klic, otevreno, text]);

  if (!klic) return null;

  if (!otevreno) {
    return (
      <button
        type="button"
        onClick={() => setOtevreno(true)}
        aria-label="Otevřít zápisník"
        style={{
          position: 'fixed', right: 14, bottom: 'max(14px, env(safe-area-inset-bottom))',
          width: 48, height: 48, borderRadius: '50%', zIndex: 40,
          border: '3px solid var(--ram)', background: 'var(--ocel-900)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(0,0,0,0.45)',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 3h11l3 3v15H5z" stroke="var(--text-akcent)" strokeWidth="2" />
          <path d="M8 9h8M8 13h8M8 17h5" stroke="var(--text-akcent)" strokeWidth="2" strokeLinecap="round" />
        </svg>
        {text.trim().length > 0 && (
          <span
            aria-hidden
            style={{
              position: 'absolute', top: 2, right: 2, width: 10, height: 10,
              borderRadius: '50%', background: 'var(--rez-400)',
            }}
          />
        )}
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
          ZÁPISNÍK
        </h2>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: 'var(--text-tlum)' }}>
          {jmeno ? jmeno.toUpperCase() : 'SOUKROMÉ'}
        </span>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'Kdo byl na které šichtě.\nKdo co tvrdil.\nKomu to nesedí.'}
        autoFocus
        style={{
          flexGrow: 1, minHeight: 0, resize: 'none',
          border: '3px solid var(--ram)', background: 'var(--blok)',
          color: 'var(--text)', padding: 14,
          fontSize: 'var(--t-prose-size)', lineHeight: 1.6, fontFamily: 'inherit',
        }}
      />

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          type="button"
          onClick={() => setText('')}
          style={{
            flexShrink: 0, minHeight: 62, padding: '0 18px',
            border: '3px solid var(--ram)', background: 'transparent',
            fontFamily: 'var(--font-nadpis)', fontSize: 15, letterSpacing: '0.1em',
            color: 'var(--ocel-400)',
          }}
        >
          SMAZAT
        </button>
        <button
          type="button"
          onClick={() => setOtevreno(false)}
          style={{
            flexGrow: 1, minHeight: 62,
            border: 'none', background: 'var(--rez-400)', color: 'var(--ocel-800)',
            fontFamily: 'var(--font-nadpis)', fontSize: 18, letterSpacing: '0.12em',
          }}
        >
          ZPĚT DO HRY
        </button>
      </div>
    </div>
  );
}
