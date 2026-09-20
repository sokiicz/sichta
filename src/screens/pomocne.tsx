import { useState } from 'react';
import {
  Blok, Hlavicka, Obrazovka, Poznamka, Popisek, Rostouci,
  Stitek, Tlacitko, Veta, Volba, Zpet,
} from '../ui/primitives';
import { prepnoutZvuk, zvukZapnuty } from '../ui/zvuk';

// ---------------------------------------------------------------- pravidla

const PRAVIDLA = [
  { nadpis: 'O CO JDE', text: 'Část party tajně kazí šichty. Pracanti je musí vyhostit dřív, než dojdou kola.', akcent: true },
  { nadpis: 'KOLO', text: 'Parta jde na šichtu a tajně volí. Pak se mluví, nominuje a hlasuje. Pak je noc.' },
  { nadpis: 'SABOTÁŽ', text: 'Padlá šichta dá sabotérům jednu odměnu: vraždu, imunitu pro kohokoliv, nebo tmu nad hlasováním. Vraždit dvakrát po sobě nejde.' },
  { nadpis: 'STÍNY', text: 'Kdo odejde, zůstává u stolu a mluví dál. Nenominuje a má jeden hlas na celý zbytek hry.' },
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
          <Volba onClick={() => setZvuk(prepnoutZvuk())} vpravo={<Stitek tlumeny>{zvuk ? 'ZAPNUTO' : 'VYPNUTO'}</Stitek>}>
            ZVUK
          </Volba>
          <div style={{ marginTop: 8 }}>
            <Veta>Houkačku pouští jeden telefon za celý stůl. Vibrace má každý svoje.</Veta>
          </div>
        </div>
      </Rostouci>

      <Blok><Veta>Během rozpravy mají telefony ležet lícem dolů. Jinak se z toho stane listování, ne hádka.</Veta></Blok>
      <Tlacitko vyska={76} onClick={onZpet}>ROZUMÍM</Tlacitko>
    </Obrazovka>
  );
}

// ---------------------------------------------------------------- pauza

export function Pauza({ kvuli, duvod, faze, zbyvaloSekund, cekaSe, jsemZakladatel, onCekat, onHratBezNej }: {
  kvuli: string; duvod: string; faze: string; zbyvaloSekund: number; cekaSe: number;
  jsemZakladatel: boolean; onCekat: () => void; onHratBezNej: () => void;
}) {
  const m = Math.floor(zbyvaloSekund / 60);
  const s = zbyvaloSekund % 60;
  return (
    <Obrazovka tmava>
      <div aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 13, background: 'repeating-linear-gradient(135deg, var(--rez-500) 0 13px, var(--ocel-900) 13px 26px)' }} />

      <div style={{ marginTop: 13 }}>
        <Hlavicka nadpis="PAUZA" akcent vpravo={<Stitek tlumeny>{faze.toUpperCase()}</Stitek>} />
      </div>

      <div style={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 26 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <svg width="42" height="48" viewBox="0 0 24 28" fill="none" aria-hidden="true">
            <rect x="3" y="3" width="6" height="22" fill="var(--rez-400)" />
            <rect x="15" y="3" width="6" height="22" fill="var(--rez-400)" />
          </svg>
          <span style={{
            fontFamily: 'var(--font-nadpis)', fontSize: 78, lineHeight: 0.9, color: 'var(--ram-tlum)',
            textDecoration: 'line-through', textDecorationThickness: 5, textDecorationColor: 'var(--rez-500)',
          }}>
            {m}:{String(s).padStart(2, '0')}
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
          {Math.floor(cekaSe / 60)}:{String(cekaSe % 60).padStart(2, '0')}
        </span>
      </Blok>

      {jsemZakladatel ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Popisek>ROZHODUJEŠ TY</Popisek>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flexGrow: 1 }}><Tlacitko druh="hlavni" vyska={76} onClick={onCekat}>ČEKAT DÁL</Tlacitko></div>
            <div style={{ flexGrow: 1 }}><Tlacitko vyska={76} onClick={onHratBezNej}>HRÁT BEZ NĚJ</Tlacitko></div>
          </div>
          <span style={{ fontSize: 'var(--t-meta-size)', fontWeight: 600, lineHeight: 1.5, color: 'var(--text-tlum)' }}>
            Hrát bez něj znamená, že jeho volba propadne jako MAKAT. Jde to přepnout kdykoliv, dokud kolo neskončí.
          </span>
        </div>
      ) : (
        <Poznamka>Zakladatel rozhodne, jestli se čeká dál, nebo se hraje bez něj.</Poznamka>
      )}
    </Obrazovka>
  );
}
