import { useEffect, useState } from 'react';
import {
  Blok, Hlavicka, Obrazovka, Poznamka, Popisek, Rostouci,
  Stitek, Tlacitko, TlacitkoOpatrne, Veta, Volba, Zpet,
} from '../ui/primitives';
import { prepnoutZvuk, zvukZapnuty } from '../ui/zvuk';
import { zaznamenat } from '../ui/telemetrie';

// ---------------------------------------------------------------- pravidla

const PRAVIDLA = [
  { nadpis: 'O CO JDE', text: 'Část party tajně kazí šichty. Pracanti je musí vyhostit dřív, než dojdou kola.', akcent: true },
  { nadpis: 'KOLO', text: 'Parta jde na šichtu a tajně volí. Pak se mluví, nominuje a hlasuje. Po padlé šichtě je noc.' },
  { nadpis: 'ŠEPTANDA', text: 'Za prošlou šichtu dostane každý vlastní pravdivou větu. Nikdo si cizí neověří, sabotér si tu svou klidně vymyslí.' },
  { nadpis: 'SABOTÁŽ', text: 'Padlá šichta dá sabotérům jednu odměnu: vraždu, imunitu pro kohokoliv, nebo tmu nad hlasováním. Vraždit dvě kola po sobě nejde. Imunitu i tmu se stůl dozví ráno.' },
  { nadpis: 'RADA', text: 'Nominovat nikoho i zdržet se hlasování jsou plnohodnotné tahy. Odchází jen ten, kdo má nadpoloviční většinu hlasů a aspoň dva. Jinak nikdo.' },
  { nadpis: 'STÍNY', text: 'Kdo odejde, zůstává u stolu a mluví dál. Nenominuje a má jeden hlas na celý zbytek hry. Použitím je pryč, zdržením ne.' },
  { nadpis: 'VÝHRA', text: 'Pracanti vyhrají vyhoštěním posledního sabotéra. Sabotéři vyhrají, když jim dojdou šichty a aspoň jeden žije.', patina: true },
];

export function Pravidla({ onZpet }: { onZpet: () => void }) {
  const [zvuk, setZvuk] = useState(zvukZapnuty());

  return (
    <Obrazovka>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, borderBottom: '3px solid var(--ram)', paddingBottom: 12 }}>
        <Zpet onClick={onZpet} />
        <h1 style={{ margin: 0, fontFamily: 'var(--font-nadpis)', fontWeight: 400, fontSize: 26, letterSpacing: '0.05em' }}>PRAVIDLA</h1>
      </div>

      <Rostouci style={{ gap: 12 }}>
        {PRAVIDLA.map((p) => (
          <div
            key={p.nadpis}
            style={{
              flexShrink: 0, padding: '13px 15px',
              borderLeft: `4px solid ${p.akcent ? 'var(--rez-400)' : p.patina ? 'var(--patina-400)' : 'var(--ram)'}`,
            }}
          >
            <div style={{ fontFamily: 'var(--font-nadpis)', fontSize: 20, letterSpacing: '0.04em', marginBottom: 6 }}>{p.nadpis}</div>
            <div style={{ fontSize: 'var(--t-prose-size)', lineHeight: 1.6, color: 'var(--text)' }}>{p.text}</div>
          </div>
        ))}

        <div style={{ flexShrink: 0, marginTop: 4 }}>
          <Volba onClick={() => { const z = prepnoutZvuk(); zaznamenat('zvuk', { detail: z ? 'zapnuto' : 'vypnuto' }); setZvuk(z); }} popis="Zvuk" vpravo={<Stitek tlumeny>{zvuk ? 'ZAPNUTO' : 'VYPNUTO'}</Stitek>}>
            ZVUK
          </Volba>
          <div style={{ marginTop: 8 }}>
            <Veta>Houkačku pouští jeden telefon za celý stůl. Vibrace má každý svoje, iPhone ji neumí.</Veta>
          </div>
        </div>
      </Rostouci>

      <Blok><Veta>Během rozpravy mají telefony ležet lícem dolů. Jinak se z toho stane listování, ne hádka. Přehled šicht a zápisník máš na tlačítkách dole, během rozpravy jsou zamčené.</Veta></Blok>
      <Tlacitko vyska={76} onClick={onZpet}>ROZUMÍM</Tlacitko>
    </Obrazovka>
  );
}

// ---------------------------------------------------------------- pauza

const cas = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * Pauza. Odpočet stojí na vteřině, kde se stálo, a čeká se na hráče, bez
 * kterého fáze nemůže skončit. Zakladatel může rozhodnout, že se hraje bez
 * něj: jeho volba pak propadne, jako by nic neodevzdal.
 */
export function Pauza({ kvuli, duvod, faze, zbyvaMs, odMs, posunHodin, jsemZakladatel, onHratBezNej, onUkoncit, onOdejit }: {
  kvuli: string; duvod: string; faze: string;
  /** Kolik ms fáze zbývalo, když se zastavila. null na jednom telefonu. */
  zbyvaMs: number | null;
  /** Čas serveru, kdy pauza začala. */
  odMs: number | null;
  posunHodin: number;
  jsemZakladatel: boolean; onHratBezNej: () => void;
  /** Když se nedá dohrát: zakladatel ukončí pro všechny, ostatní odejdou. */
  onUkoncit?: () => void; onOdejit?: () => void;
}) {
  const [ted, setTed] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setTed(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const cekaSe = odMs != null ? Math.max(0, ted + posunHodin - odMs) : 0;

  return (
    <Obrazovka tmava>
      <div aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 13, background: 'repeating-linear-gradient(135deg, var(--rez-500) 0 13px, var(--ocel-900) 13px 26px)' }} />

      <div style={{ marginTop: 13 }}>
        <Hlavicka nadpis="PAUZA" akcent vpravo={<Stitek tlumeny>{faze.toUpperCase()}</Stitek>} />
      </div>

      <div style={{ flexGrow: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'safe center', alignItems: 'center', gap: 26 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <svg width="42" height="48" viewBox="0 0 24 28" fill="none" aria-hidden="true">
            <rect x="3" y="3" width="6" height="22" fill="var(--rez-400)" />
            <rect x="15" y="3" width="6" height="22" fill="var(--rez-400)" />
          </svg>
          <span style={{
            fontFamily: 'var(--font-nadpis)', fontSize: 78, lineHeight: 0.9, color: 'var(--ram-tlum)',
            textDecoration: 'line-through', textDecorationThickness: 5, textDecorationColor: 'var(--rez-500)',
          }}>
            {zbyvaMs != null ? cas(zbyvaMs) : '–:––'}
          </span>
        </div>

        <div style={{ border: '4px solid var(--rez-500)', background: 'rgba(196,98,44,0.14)', padding: '20px 22px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 9 }}>
          <Popisek>DŮVOD</Popisek>
          <span style={{ fontFamily: 'var(--font-nadpis)', fontSize: 30, lineHeight: 1.08, letterSpacing: '0.02em' }}>
            {kvuli.toUpperCase()}<br />{duvod.toUpperCase()}
          </span>
        </div>

        <div style={{ fontSize: 'var(--t-prose-size)', lineHeight: 1.6, color: 'var(--text)', textAlign: 'center', maxWidth: 280 }}>
          Odpočet stojí. Jakmile se {kvuli} vrátí, poběží dál od stejné vteřiny.
        </div>
      </div>

      <Blok style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 'var(--t-meta-size)', fontWeight: 600, color: 'var(--text-tlum)' }}>Čeká se už</span>
        <span style={{ fontFamily: 'var(--font-nadpis)', fontSize: 17, letterSpacing: '0.06em', color: 'var(--ocel-400)' }}>
          {cas(cekaSe)}
        </span>
      </Blok>

      {jsemZakladatel ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Popisek>ROZHODUJEŠ TY</Popisek>
          <Tlacitko vyska={76} onClick={onHratBezNej}>HRÁT BEZ NĚJ</Tlacitko>
          <span style={{ fontSize: 'var(--t-meta-size)', fontWeight: 600, lineHeight: 1.5, color: 'var(--text-tlum)' }}>
            Hrát bez něj znamená, že jeho volba propadne, jako by nic neodevzdal. Jakmile se vrátí, hraje zase normálně.
          </span>
          {onUkoncit && (
            <TlacitkoOpatrne onClick={onUkoncit} potvrzeni="OPRAVDU UKONČIT PRO VŠECHNY?">UKONČIT ŠICHTU</TlacitkoOpatrne>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Poznamka>Zakladatel rozhodne, jestli se čeká dál, nebo se hraje bez něj.</Poznamka>
          {onOdejit && (
            <TlacitkoOpatrne onClick={onOdejit} potvrzeni="OPRAVDU ODEJÍT?">ODEJÍT ZE ŠICHTY</TlacitkoOpatrne>
          )}
        </div>
      )}
    </Obrazovka>
  );
}
