import { createContext, useContext } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { vibrovat, VZOR } from './zvuk';

/**
 * Stavební kameny obrazovek. Všechno bere barvy z tokenů, nikdy natvrdo.
 * Pravidla, která tyhle komponenty vynucují, jsou v brand/README.md.
 */

// ---------------------------------------------------------------- obrazovka

// ---------------------------------------------------------------- kdo drží telefon

/**
 * Na jednom telefonu se zařízení podává dokola a je snadné ztratit nit, kdo
 * je zrovna na řadě. Jméno držitele proto visí nad každou obrazovkou, ne jen
 * na té předávací. Online je kontext prázdný a pruh se vůbec nevykreslí,
 * protože tam drží telefon každý svůj.
 */
const Drzitel = createContext<string | null>(null);

/**
 * Plavou-li nad obrazovkou tlačítka přehledu a zápisníku, obsah si dole
 * nechá místo, ať nezakrývají poznámku ani ukazatel postupu.
 */
export const Pomucky = createContext(false);

export function PredejDrzitele({ jmeno, children }: { jmeno: string | null; children: ReactNode }) {
  return <Drzitel.Provider value={jmeno}>{children}</Drzitel.Provider>;
}

function PruhDrzitele() {
  const jmeno = useContext(Drzitel);
  if (!jmeno) return null;
  return (
    <div
      style={{
        flexShrink: 0, display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8,
        padding: '7px 12px', background: 'var(--ocel-900)', borderBottom: '3px solid var(--ram)',
      }}
    >
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', color: 'var(--text-tlum)' }}>
        TELEFON DRŽÍ
      </span>
      <span style={{ fontFamily: 'var(--font-nadpis)', fontSize: 15, letterSpacing: '0.1em', color: 'var(--text-akcent)' }}>
        {jmeno.toUpperCase()}
      </span>
    </div>
  );
}

export function Obrazovka({
  children,
  tmava,
  zare,
  rez,
}: {
  children: ReactNode;
  /** Noc, předěl a konec jedou na tmavším podkladu. */
  tmava?: boolean;
  /** Lampa shora. Patří na obrazovky, kde se něco odkrývá. */
  zare?: boolean;
  /** Rez zespoda. Patří tam, kde se rozhoduje. */
  rez?: boolean;
}) {
  const pomucky = useContext(Pomucky);
  return (
    <div
      style={{
        position: 'relative',
        height: '100%',
        overflow: 'hidden',
        background: tmava ? 'var(--ocel-900)' : 'var(--pozadi)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {zare && (
        <div
          aria-hidden
          style={{
            position: 'absolute', top: -180, left: '50%', marginLeft: -250,
            width: 500, height: 420, pointerEvents: 'none',
            background: 'radial-gradient(ellipse at center, rgba(232,139,69,0.16) 0%, transparent 72%)',
          }}
        />
      )}
      {rez && (
        <div
          aria-hidden
          style={{
            position: 'absolute', bottom: -60, left: -60, right: -60, height: 420,
            pointerEvents: 'none',
            background: 'linear-gradient(180deg, transparent 0%, rgba(168,74,26,0.28) 100%)',
          }}
        />
      )}
      <PruhDrzitele />
      <div
        style={{
          position: 'relative',
          flexGrow: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--mezera-m)',
          padding: 'var(--okraj)',
          paddingTop: 'max(var(--okraj), env(safe-area-inset-top))',
          paddingBottom: pomucky
            ? 'calc(max(var(--okraj), env(safe-area-inset-bottom)) + 40px)'
            : 'max(var(--okraj), env(safe-area-inset-bottom))',
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Roste a scrolluje se uvnitř, aby hlavní tlačítko zůstalo dole i na malém displeji. */
export function Rostouci({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ flexGrow: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--mezera-s)', ...style }}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------- hlavička

export function Hlavicka({ nadpis, vpravo, akcent }: { nadpis: string; vpravo?: ReactNode; akcent?: boolean }) {
  return (
    <header
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        gap: 12, borderBottom: '4px solid var(--ram)', paddingBottom: 12,
      }}
    >
      <h1 style={{
        margin: 0, fontFamily: 'var(--font-nadpis)', fontWeight: 400,
        fontSize: 'var(--t-title-size)', letterSpacing: 'var(--t-title-ls)',
        color: akcent ? 'var(--text-akcent)' : 'var(--text)',
      }}>
        {nadpis}
      </h1>
      {vpravo}
    </header>
  );
}

export function Stitek({ children, tlumeny }: { children: ReactNode; tlumeny?: boolean }) {
  return (
    <span style={{
      fontSize: 'var(--t-meta-size)', fontWeight: 700, letterSpacing: '0.18em',
      color: tlumeny ? 'var(--text-tlum)' : 'var(--text)',
    }}>
      {children}
    </span>
  );
}

export function Popisek({ children }: { children: ReactNode }) {
  return (
    <div style={{
      fontSize: 'var(--t-label-size)', fontWeight: 700,
      letterSpacing: 'var(--t-label-ls)', color: 'var(--text-tlum)',
    }}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------- bloky

export function Blok({
  children, popisek, silny, akcentni, style,
}: {
  children: ReactNode; popisek?: string; silny?: boolean; akcentni?: boolean; style?: CSSProperties;
}) {
  return (
    <section
      style={{
        border: `${silny ? 'var(--ram-akce)' : 'var(--ram-blok)'} solid ${akcentni ? 'var(--rez-400)' : 'var(--ram)'}`,
        background: akcentni ? 'rgba(232,139,69,0.10)' : 'var(--blok)',
        padding: 16, display: 'flex', flexDirection: 'column', gap: 12, ...style,
      }}
    >
      {popisek && <Popisek>{popisek}</Popisek>}
      {children}
    </section>
  );
}

/** Vysvětlivka u levé hrany. Nese tón hry, ne instrukce k ovládání. */
export function Poznamka({ children, varovna }: { children: ReactNode; varovna?: boolean }) {
  return (
    <p style={{
      margin: 0, borderLeft: `4px solid ${varovna ? 'var(--rez-500)' : 'var(--ram)'}`,
      background: varovna ? 'rgba(196,98,44,0.12)' : 'transparent',
      padding: '12px 14px', fontSize: 'var(--t-prose-size)',
      lineHeight: 'var(--t-prose-lh)', color: 'var(--text)',
    }}>
      {children}
    </p>
  );
}

export function Veta({ children }: { children: ReactNode }) {
  return (
    <p style={{
      margin: 0, fontSize: 'var(--t-body-size)', fontWeight: 600,
      lineHeight: 'var(--t-body-lh)', color: 'var(--text)',
    }}>
      {children}
    </p>
  );
}

// ---------------------------------------------------------------- tlačítka

type Druh = 'hlavni' | 'vedlejsi' | 'tichy';

const DRUHY: Record<Druh, CSSProperties> = {
  hlavni: { border: 'var(--ram-akce) solid var(--rez-400)', background: 'var(--rez-400)', color: 'var(--ocel-800)' },
  vedlejsi: { border: 'var(--ram-akce) solid var(--ram-silny)', background: 'var(--blok-tlac)', color: 'var(--text-silny)' },
  tichy: { border: 'var(--ram-blok) solid var(--ram-tlum)', background: 'transparent', color: 'var(--ocel-400)' },
};

/**
 * Každý dotek na ovládací prvek krátce zavibruje. Je to tiché, takže to
 * nepřehluší stůl a neprozradí, co kdo zmáčkl: vibruje se u obou voleb stejně.
 */
function sDotekem(onClick?: () => void) {
  if (!onClick) return undefined;
  return () => { vibrovat(VZOR.klepnuti); onClick(); };
}

export function Tlacitko({
  children, onClick, druh = 'vedlejsi', vyska = 'var(--tlacitko-h)', zvoleno, popis, male,
}: {
  children: ReactNode; onClick?: () => void; druh?: Druh;
  vyska?: number | string; zvoleno?: boolean; popis?: string;
  /** Menší písmo pro delší nápisy, ať se na úzkém telefonu nelámou. */
  male?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={sDotekem(onClick)}
      aria-label={popis}
      aria-pressed={zvoleno}
      style={{
        width: '100%', minHeight: vyska, flexShrink: 0,
        fontFamily: 'var(--font-nadpis)', fontSize: male ? 22 : 'var(--t-button-size)',
        letterSpacing: male ? '0.14em' : 'var(--t-button-ls)',
        ...(zvoleno ? DRUHY.hlavni : DRUHY[druh]),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {children}
    </button>
  );
}

/** Volba ze seznamu. Text vlevo, ať se dá číst při rychlém projíždění. */
export function Volba({
  children, onClick, zvoleno, vypnuto, vpravo, popis,
}: {
  children: ReactNode; onClick?: () => void; zvoleno?: boolean; vypnuto?: boolean; vpravo?: ReactNode;
  /** Přístupný název, když nápis sám neříká, co se přepíná. */
  popis?: string;
}) {
  return (
    <button
      type="button"
      onClick={vypnuto ? undefined : sDotekem(onClick)}
      disabled={vypnuto}
      aria-label={popis ?? (typeof children === 'string' ? children : undefined)}
      aria-pressed={zvoleno}
      style={{
        width: '100%', minHeight: 62, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        padding: '0 16px', textAlign: 'left',
        fontFamily: 'var(--font-nadpis)', fontSize: 'var(--t-name-size)',
        letterSpacing: 'var(--t-name-ls)',
        border: `${zvoleno ? 'var(--ram-akce)' : 'var(--ram-blok)'} solid ${
          zvoleno ? 'var(--rez-400)' : vypnuto ? 'var(--ram-tlum)' : 'var(--ram)'
        }`,
        background: zvoleno ? 'var(--rez-400)' : vypnuto ? 'transparent' : 'var(--blok)',
        color: zvoleno ? 'var(--ocel-800)' : vypnuto ? 'var(--ocel-400)' : 'var(--text)',
      }}
    >
      <span>{children}</span>
      {vpravo}
    </button>
  );
}

// ---------------------------------------------------------------- soupiska

export type StavRadku = 'cekame' | 'hotovo' | 'ty' | 'pryc';

export function RadekHrace({
  jmeno, stav = 'cekame', vpravo,
}: {
  jmeno: string; stav?: StavRadku; vpravo?: ReactNode;
}) {
  const hotovy = stav === 'hotovo' || stav === 'ty';
  const pryc = stav === 'pryc';
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        borderLeft: `4px ${hotovy ? 'solid' : 'dashed'} ${hotovy ? 'var(--rez-400)' : 'var(--ram-tlum)'}`,
        background: hotovy ? 'rgba(0,0,0,0.20)' : 'transparent',
        padding: '11px 13px',
        opacity: pryc ? 0.55 : 1,
        animation: 'vyjet 200ms ease-out',
      }}
    >
      <span style={{
        fontFamily: 'var(--font-nadpis)', fontSize: 'var(--t-name-size)',
        letterSpacing: 'var(--t-name-ls)',
        textDecoration: pryc ? 'line-through' : undefined,
        color: stav === 'ty' ? 'var(--text-akcent)' : hotovy ? 'var(--text)' : 'var(--ocel-400)',
      }}>
        {jmeno}
      </span>
      {vpravo}
    </div>
  );
}

export function Fajfka() {
  return (
    <svg width="18" height="14" viewBox="0 0 20 15" fill="none" aria-hidden="true">
      <path d="M1 7.5L7 13.5L19 1.5" stroke="var(--rez-400)" strokeWidth="3" />
    </svg>
  );
}

// ---------------------------------------------------------------- čas

export function Odpocet({ sekundy, obri }: { sekundy: number | null; obri?: boolean }) {
  // null znamená, že fázi nehlídají hodiny. Zamrzlé číslo by vypadalo jako chyba.
  if (sekundy === null) return null;
  const m = Math.floor(Math.max(0, sekundy) / 60);
  const s = Math.max(0, sekundy) % 60;
  const specha = sekundy <= 10 && sekundy > 0;
  return (
    <time
      dateTime={`PT${Math.max(0, sekundy)}S`}
      style={{
        fontFamily: 'var(--font-nadpis)',
        fontSize: obri ? 110 : 'var(--t-timer-size)',
        lineHeight: obri ? 0.88 : 1,
        color: specha ? 'var(--rez-500)' : obri ? 'var(--ocel-50)' : 'var(--rez-400)',
        animation: specha ? 'tep 1000ms ease-in-out infinite' : undefined,
        display: 'inline-block',
      }}
    >
      {m}:{String(s).padStart(2, '0')}
    </time>
  );
}

/**
 * Obrazovka běží na čas a přepne se sama. Vizuálně je to 5px pruh,
 * dotyková plocha má ale 45px, jinak by to byl nechytatelný cíl.
 */
export function Ukazatel({ podil, onPreskocit }: { podil: number; onPreskocit?: () => void }) {
  const pruh = (
    <span style={{
      display: 'block', height: 5,
      width: `${Math.round(Math.min(1, Math.max(0, podil)) * 100)}%`,
      background: 'var(--rez-400)', transition: 'width 1s linear',
    }} />
  );
  const ram: React.CSSProperties = {
    display: 'block', width: '100%', height: 5, flexShrink: 0,
    padding: '20px 0', margin: '-20px 0',
    background: 'var(--ocel-600)', backgroundClip: 'content-box', border: 'none',
  };
  // bez akce to není tlačítko, ať na něj nikdo marně nemačká
  if (!onPreskocit) return <div aria-hidden style={ram}>{pruh}</div>;
  return (
    <button
      type="button"
      onClick={onPreskocit}
      aria-label="Přeskočit na další fázi"
      style={{
        display: 'block', width: '100%', height: 5, flexShrink: 0,
        padding: '20px 0', margin: '-20px 0',
        background: 'var(--ocel-600)', backgroundClip: 'content-box',
        border: 'none',
      }}
    >
      {pruh}
    </button>
  );
}

// ---------------------------------------------------------------- razítko

export function Razitko({
  nadpis, popisek, barva = 'neutral', naklon = -1.6,
}: {
  nadpis: string; popisek?: string;
  /** Patina a spál popisují VÝSLEDEK ŠICHTY, nikdy člověka. Role je neutrální. */
  barva?: 'neutral' | 'proslo' | 'padlo';
  naklon?: number;
}) {
  const pozadi = barva === 'proslo' ? 'var(--patina-400)' : barva === 'padlo' ? 'var(--spal-500)' : 'var(--ocel-50)';
  const text = barva === 'padlo' ? '#FFECE6' : 'var(--ocel-800)';
  return (
    <div
      style={{
        background: pozadi, padding: '28px 20px', textAlign: 'center',
        boxShadow: '0 10px 28px rgba(0,0,0,0.42)',
        ['--naklon' as string]: `${naklon}deg`,
        transform: `rotate(${naklon}deg)`,
        animation: 'dosednout 260ms cubic-bezier(0.2, 0.9, 0.3, 1.2) 600ms both',
      }}
    >
      {popisek && (
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.3em', color: text, opacity: 0.66, marginBottom: 6 }}>
          {popisek}
        </div>
      )}
      <div style={{
        fontFamily: 'var(--font-nadpis)', fontSize: 54, lineHeight: 0.92,
        letterSpacing: '0.02em', color: text,
      }}>
        {nadpis}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- značka

export function Znacka({ velikost = 64 }: { velikost?: number }) {
  return (
    <svg width={velikost} height={velikost} viewBox="0 0 64 64" fill="none" role="img" aria-label="Šichta">
      <rect x="10" y="12" width="8" height="40" fill="var(--ocel-100)" />
      <rect x="26" y="12" width="8" height="40" fill="var(--ocel-100)" />
      <rect x="42" y="12" width="8" height="40" fill="var(--ocel-100)" />
      <path d="M5 50 L59 14" stroke="var(--rez-400)" strokeWidth="8" />
    </svg>
  );
}

export function Zamek({ velikost = 52 }: { velikost?: number }) {
  return (
    <svg width={velikost} height={velikost * 1.19} viewBox="0 0 54 64" fill="none" aria-hidden="true">
      <rect x="7" y="27" width="40" height="32" rx="3" stroke="var(--ocel-300)" strokeWidth="3" />
      <path d="M16 27V18a11 11 0 0 1 22 0v9" stroke="var(--ocel-300)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="27" cy="42" r="3.5" fill="var(--rez-400)" />
    </svg>
  );
}

export function Zpet({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button" onClick={onClick} aria-label="Zpět"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 44, height: 44, flexShrink: 0,
        border: 'var(--ram-blok) solid var(--ram)', background: 'transparent',
      }}
    >
      <svg width="18" height="16" viewBox="0 0 18 16" fill="none" aria-hidden="true">
        <path d="M18 8H2M7 2L1 8l6 6" stroke="var(--text)" strokeWidth="2.5" />
      </svg>
    </button>
  );
}
