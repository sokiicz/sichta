import {
  Blok, Hlavicka, Obrazovka, Poznamka, Popisek, Rostouci,
  Stitek, Tlacitko, Veta, Znacka,
} from '../ui/primitives';
import type { Role, Tym } from '../game/types';

// ---------------------------------------------------------------- konec

/** Kdo vyhrál. Žádná jména sabotérů, ta přijdou až na další obrazovce. */
export function Konec({ vitez, duvod, sicht, padlo, cas, onOdhalit }: {
  vitez: Tym; duvod: string; sicht: number; padlo: number; cas: string; onOdhalit: () => void;
}) {
  return (
    <Obrazovka tmava rez>
      <div style={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 22, textAlign: 'center' }}>
        <Znacka velikost={76} />
        <div>
          <Popisek>VYHRÁVAJÍ</Popisek>
          <div style={{ marginTop: 10, fontFamily: 'var(--font-nadpis)', fontSize: 66, lineHeight: 0.9, letterSpacing: '0.02em', color: 'var(--text-akcent)', animation: 'vyjet 320ms ease-out' }}>
            {vitez === 'pracanti' ? 'PRACANTI' : 'SABOTÉŘI'}
          </div>
        </div>
        <Blok silny style={{ maxWidth: 300 }}>
          <Veta>{duvod}</Veta>
        </Blok>
      </div>

      <div style={{ display: 'flex', gap: 11 }}>
        {[
          { p: 'ŠICHT', v: String(sicht) },
          { p: 'PADLO', v: String(padlo) },
          { p: 'ČAS', v: cas },
        ].map((x) => (
          <div key={x.p} style={{ flexGrow: 1, border: '3px solid var(--ram)', padding: 13, textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', color: 'var(--text-tlum)' }}>{x.p}</div>
            <div style={{ fontFamily: 'var(--font-nadpis)', fontSize: 26 }}>{x.v}</div>
          </div>
        ))}
      </div>

      <Tlacitko druh="hlavni" vyska={82} onClick={onOdhalit}>KDO BYL KDO</Tlacitko>
    </Obrazovka>
  );
}

// ---------------------------------------------------------------- odhalení

export interface Odhaleny {
  jmeno: string;
  role: Role;
  predak: boolean;
  /** Jak a kdy odešel. Podstatné jméno, ne příčestí: jména jsou obojího rodu. */
  odchod: string | null;
}

export function Odhaleni({ hraci, cuch, onPrubeh, onZnovu }: {
  hraci: Odhaleny[];
  cuch: { jmeno: string; popis: string } | null;
  onPrubeh: () => void; onZnovu: () => void;
}) {
  return (
    <Obrazovka>
      <Hlavicka nadpis="KDO BYL KDO" vpravo={<Stitek tlumeny>{hraci.length} HRÁČŮ</Stitek>} />

      <Rostouci style={{ gap: 8 }}>
        {hraci.map((h, i) => {
          const zly = h.role === 'saboter';
          return (
            <div
              key={h.jmeno}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
                flexShrink: 0, padding: '12px 13px',
                borderLeft: `4px solid ${zly ? 'var(--spal-500)' : 'var(--patina-400)'}`,
                background: zly ? 'rgba(184,66,46,0.14)' : 'transparent',
                animation: `vyjet 220ms ease-out ${i * 90}ms both`,
              }}
            >
              <span style={{ fontFamily: 'var(--font-nadpis)', fontSize: 21 }}>{h.jmeno.toUpperCase()}</span>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', color: zly ? '#E8897A' : '#9BC095', textAlign: 'right' }}>
                {zly ? 'SABOTÉR' : 'PRACANT'}
                {h.predak && ' · PŘEDÁK'}
                {h.odchod && ` · ${h.odchod.toUpperCase()}`}
              </span>
            </div>
          );
        })}

        {cuch && (
          <Blok silny akcentni style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 2l2.6 6.3 6.8.5-5.2 4.4 1.6 6.6L12 16.3 6.2 19.8l1.6-6.6L2.6 8.8l6.8-.5L12 2Z" stroke="var(--rez-400)" strokeWidth="2" strokeLinejoin="round" />
            </svg>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', color: 'var(--text-tlum)' }}>NEJLEPŠÍ ČUCH</div>
              <div style={{ fontFamily: 'var(--font-nadpis)', fontSize: 25, letterSpacing: '0.03em', color: 'var(--text-akcent)' }}>
                {cuch.jmeno.toUpperCase()}
              </div>
              <div style={{ fontSize: 'var(--t-meta-size)', color: 'var(--text)' }}>{cuch.popis}</div>
            </div>
          </Blok>
        )}
      </Rostouci>

      <div style={{ display: 'flex', gap: 11 }}>
        <div style={{ flexGrow: 1 }}><Tlacitko vyska={72} onClick={onPrubeh}>PRŮBĚH</Tlacitko></div>
        <div style={{ flexGrow: 1 }}><Tlacitko druh="hlavni" vyska={72} onClick={onZnovu}>JEŠTĚ JEDNOU</Tlacitko></div>
      </div>
    </Obrazovka>
  );
}

// ---------------------------------------------------------------- průběh

export interface KoloPrehled {
  cislo: number;
  padla: boolean;
  sabotazi: number;
  parta: { jmeno: string; saboter: boolean }[];
  rada: string | null;
  noc: string | null;
}

export function Prehled({ kola, poznamka, onZpet }: {
  kola: KoloPrehled[]; poznamka: string | null; onZpet: () => void;
}) {
  return (
    <Obrazovka>
      <Hlavicka nadpis="PRŮBĚH" vpravo={<Stitek tlumeny>{kola.length} ŠICHT</Stitek>} />

      <Rostouci style={{ gap: 11 }}>
        {kola.map((k) => (
          <Blok key={k.cislo}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontFamily: 'var(--font-nadpis)', fontSize: 20, letterSpacing: '0.04em' }}>ŠICHTA {k.cislo}</span>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', color: k.padla ? '#E8897A' : '#9BC095' }}>
                {k.padla ? `PADLA · KAZILI ${k.sabotazi}` : 'PROŠLA'}
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {k.parta.map((p) => (
                <span
                  key={p.jmeno}
                  style={{
                    fontSize: 'var(--t-meta-size)', fontWeight: 600, padding: '4px 8px',
                    border: `2px solid ${p.saboter ? 'var(--spal-500)' : 'var(--ram-tlum)'}`,
                    color: p.saboter ? '#E8897A' : 'var(--text-tlum)',
                  }}
                >
                  {p.jmeno}
                </span>
              ))}
            </div>
            <div style={{ fontSize: 'var(--t-meta-size)', color: 'var(--text)' }}>
              Rada: <strong>{k.rada ?? 'nikdo'}</strong>
              {k.noc && <> · Noc: <strong>{k.noc}</strong></>}
            </div>
          </Blok>
        ))}

        {poznamka && <Poznamka>{poznamka}</Poznamka>}
      </Rostouci>

      <Tlacitko vyska={76} onClick={onZpet}>ZPĚT</Tlacitko>
    </Obrazovka>
  );
}
