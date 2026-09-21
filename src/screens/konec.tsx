import {
  Blok, Hlavicka, Obrazovka, Poznamka, Popisek, Rostouci,
  Stitek, Tlacitko, Veta, Znacka,
} from '../ui/primitives';
import type { Role, Smena, Tym } from '../game/types';

// ---------------------------------------------------------------- konec

/** Kdo vyhrál. Žádná jména sabotérů, ta přijdou až na další obrazovce. */
export function Konec({ vitez, duvod, sicht, padlo, stinu, onOdhalit }: {
  vitez: Tym; duvod: string; sicht: number; padlo: number; stinu: number; onOdhalit: () => void;
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
          { p: 'STÍNŮ', v: String(stinu) },
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
  id: string;
  jmeno: string;
  role: Role;
  predak: boolean;
  /** Jak a kdy odešel. Podstatné jméno, ne příčestí: jména jsou obojího rodu. */
  odchod: string | null;
}

export function Odhaleni({ hraci, cuch, jsemZakladatel, onPrubeh, onZnovu }: {
  hraci: Odhaleny[];
  cuch: { jmeno: string; popis: string } | null;
  /** Online spouští další partii zakladatel, ostatní čekají. */
  jsemZakladatel: boolean;
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
              key={h.id}
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
        <div style={{ flexGrow: 1 }}>
          {jsemZakladatel
            ? <Tlacitko druh="hlavni" vyska={72} onClick={onZnovu}>JEŠTĚ JEDNOU</Tlacitko>
            : <Tlacitko druh="tichy" vyska={72}>ČEKÁ SE NA ZAKLADATELE</Tlacitko>}
        </div>
      </div>
    </Obrazovka>
  );
}

// ---------------------------------------------------------------- průběh

export interface KoloPrehled {
  cislo: number;
  smeny: {
    smena: Smena;
    padla: boolean;
    sabotazi: number;
    /** `saboter` se plní jen po konci hry. Během hry role nikdo nevidí. */
    parta: { id: string; jmeno: string; saboter?: boolean }[];
  }[];
  vyhosteny: { jmeno: string; role: Role | null } | null;
  obet: string | null;
  imunni: string | null;
  tma: boolean;
  /** null: hlasy zůstaly potmě. Prázdné pole: nikdo nehlasoval nebo rada nebyla. */
  hlasy: { kdo: string; komu: string; stin: boolean }[] | null;
  zdrzeliSe: string[];
  nehlasovali: string[];
}

const NAZEV_SMENY: Record<Smena, string> = { dopoledni: 'DOPOLEDNÍ', odpoledni: 'ODPOLEDNÍ' };

/** Seznam kol. Sdílí ho průběh po konci hry a přehled během ní. */
export function SeznamKol({ kola, prazdne }: { kola: KoloPrehled[]; prazdne: string }) {
  if (kola.length === 0) return <Poznamka>{prazdne}</Poznamka>;
  return (
    <>
      {kola.map((k) => (
        <Blok key={k.cislo}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontFamily: 'var(--font-nadpis)', fontSize: 20, letterSpacing: '0.04em' }}>ŠICHTA {k.cislo}</span>
            {k.smeny.length === 1 && k.smeny[0] && (
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', color: k.smeny[0].padla ? '#E8897A' : '#9BC095' }}>
                {k.smeny[0].padla ? `PADLA · KAZILI ${k.smeny[0].sabotazi}` : 'PROŠLA'}
              </span>
            )}
          </div>
          {k.smeny.map((sm) => (
            <div key={sm.smena} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {k.smeny.length > 1 && (
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', color: sm.padla ? '#E8897A' : '#9BC095' }}>
                  {NAZEV_SMENY[sm.smena]} · {sm.padla ? `PADLA · KAZILI ${sm.sabotazi}` : 'PROŠLA'}
                </span>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {sm.parta.map((p) => (
                  <span
                    key={p.id}
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
            </div>
          ))}
          <div style={{ fontSize: 'var(--t-meta-size)', color: 'var(--text)', lineHeight: 1.6 }}>
            Rada: <strong>{k.vyhosteny ? `${k.vyhosteny.jmeno}${k.vyhosteny.role ? ` (${k.vyhosteny.role === 'saboter' ? 'sabotér' : 'pracant'})` : ''}` : 'nikdo'}</strong>
            {k.imunni && <> · Imunita: <strong>{k.imunni}</strong></>}
            {k.tma && <> · <strong>potmě</strong></>}
            {k.obet && <> · Noc: <strong>{k.obet}</strong></>}
          </div>
          {k.hlasy && k.hlasy.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {k.hlasy.map((h, i) => (
                <span key={`${h.kdo}-${i}`} style={{ fontSize: 11, fontWeight: 600, padding: '3px 7px', border: `2px solid ${h.stin ? 'var(--rez-700)' : 'var(--ram-tlum)'}`, color: 'var(--text-tlum)' }}>
                  {h.kdo} → {h.komu}
                </span>
              ))}
            </div>
          )}
          {(k.zdrzeliSe.length > 0 || k.nehlasovali.length > 0) && (
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tlum)', lineHeight: 1.6 }}>
              {k.zdrzeliSe.length > 0 && <>Zdrželi se: {k.zdrzeliSe.join(', ')}</>}
              {k.zdrzeliSe.length > 0 && k.nehlasovali.length > 0 && ' · '}
              {k.nehlasovali.length > 0 && <>Nehlasovali: {k.nehlasovali.join(', ')}</>}
            </div>
          )}
        </Blok>
      ))}
    </>
  );
}

export function Prehled({ kola, onZpet }: { kola: KoloPrehled[]; onZpet: () => void }) {
  return (
    <Obrazovka>
      <Hlavicka nadpis="PRŮBĚH" vpravo={<Stitek tlumeny>{kola.length} ŠICHT</Stitek>} />
      <Rostouci style={{ gap: 11 }}>
        <SeznamKol kola={kola} prazdne="Ještě neproběhla žádná šichta." />
      </Rostouci>
      <Tlacitko vyska={76} onClick={onZpet}>ZPĚT</Tlacitko>
    </Obrazovka>
  );
}
