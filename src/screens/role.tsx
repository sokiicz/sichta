import { useState } from 'react';
import {
  Blok, Fajfka, Hlavicka, Obrazovka, Poznamka, Popisek, RadekHrace,
  Rostouci, Stitek, Tlacitko, Ukazatel, Zamek,
} from '../ui/primitives';
import type { Hrac, HracId, Role } from '../game/types';

interface Spolu { id: HracId; jmeno: string; predak: boolean }

/**
 * Jediná obrazovka ve hře, která se zakrývá. Odkryje se, jen dokud držíš prst.
 * Jinde to nemá smysl: tam se mačkají tlačítka a obě role vidí totéž.
 */
export function TvaRole({
  role, spoluSaboteri, jsemPredak, pocetHracu, pocetSaboteru, pripraven, onPripraven,
}: {
  role: Role | null;
  spoluSaboteri: Spolu[];
  jsemPredak: boolean;
  pocetHracu: number;
  pocetSaboteru: number;
  pripraven: boolean;
  onPripraven: () => void;
}) {
  const [drzim, setDrzim] = useState(false);
  const [videl, setVidel] = useState(false);

  const drz = () => { setDrzim(true); setVidel(true); };
  const pust = () => setDrzim(false);

  return (
    <Obrazovka zare>
      <Hlavicka
        nadpis="TVÁ ROLE"
        akcent
        vpravo={<Stitek tlumeny>{pocetHracu} HRÁČŮ · {pocetSaboteru} SABOTÉŘI</Stitek>}
      />

      <div
        style={{
          flexGrow: 1, minHeight: 0, border: 'var(--ram-akce) solid var(--ram)',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          gap: 20, padding: 24, overflow: 'hidden',
        }}
      >
        {drzim && role ? (
          <div style={{ animation: 'odkryt 180ms ease-out', display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div>
              <Popisek>JSI</Popisek>
              <div style={{ marginTop: 7, fontFamily: 'var(--font-nadpis)', fontSize: 54, lineHeight: 0.92, letterSpacing: '0.02em', color: 'var(--text-akcent)' }}>
                {role === 'saboter' ? 'SABOTÉR' : 'PRACANT'}
              </div>
            </div>

            {role === 'saboter' ? (
              <>
                <div style={{ borderTop: '2px solid var(--ram)', paddingTop: 19 }}>
                  <Popisek>{spoluSaboteri.length === 1 ? 'DRUHÝ SABOTÉR' : 'KAZÍTE SPOLU'}</Popisek>
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {spoluSaboteri.map((s) => (
                      <div key={s.id} style={{ fontFamily: 'var(--font-nadpis)', fontSize: 27, letterSpacing: '0.03em' }}>
                        {s.jmeno.toUpperCase()}
                      </div>
                    ))}
                    {spoluSaboteri.length === 0 && (
                      <div style={{ fontFamily: 'var(--font-nadpis)', fontSize: 27, color: 'var(--ocel-400)' }}>JSI NA TO SÁM</div>
                    )}
                  </div>
                </div>
                <div style={{ borderTop: '2px solid var(--ram)', paddingTop: 19 }}>
                  <Popisek>PŘEDÁK</Popisek>
                  <div style={{ marginTop: 10, fontFamily: 'var(--font-nadpis)', fontSize: 27, letterSpacing: '0.03em', color: 'var(--text-akcent)' }}>
                    {jsemPredak ? 'TY' : (spoluSaboteri.find((s) => s.predak)?.jmeno.toUpperCase() ?? '?')}
                  </div>
                  <div style={{ marginTop: 7, fontSize: 'var(--t-prose-size)', lineHeight: 'var(--t-prose-lh)', color: 'var(--text-tlum)' }}>
                    {jsemPredak ? 'V noci rozhoduješ ty. Ostatní jen navrhují.' : 'V noci rozhoduje on. Ty jen navrhuješ.'}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div style={{ borderTop: '2px solid var(--ram)', paddingTop: 19 }}>
                  <Popisek>ZNÁŠ</Popisek>
                  <div style={{ marginTop: 10, fontFamily: 'var(--font-nadpis)', fontSize: 27, letterSpacing: '0.03em', color: 'var(--ocel-400)' }}>
                    NIKOHO
                  </div>
                </div>
                <div style={{ borderTop: '2px solid var(--ram)', paddingTop: 19 }}>
                  <Popisek>ÚKOL</Popisek>
                  <div style={{ marginTop: 10, fontSize: 'var(--t-body-size)', fontWeight: 600, lineHeight: 'var(--t-body-lh)' }}>
                    {pocetSaboteru} z vás kazí. Najdi je dřív, než dojdou šichty.
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, textAlign: 'center' }}>
            <Zamek />
            <div style={{ fontFamily: 'var(--font-nadpis)', fontSize: 25, letterSpacing: '0.07em', lineHeight: 1.3 }}>
              PODRŽ PRST<br />PRO ZOBRAZENÍ
            </div>
            <div style={{ fontSize: 'var(--t-prose-size)', lineHeight: 'var(--t-prose-lh)', color: 'var(--text-tlum)', maxWidth: 250 }}>
              Jakmile pustíš, zase se to zakryje. Tuhle obrazovku vidí všichni stejně, ať jsou kdokoliv.
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        onPointerDown={drz}
        onPointerUp={pust}
        onPointerLeave={pust}
        onPointerCancel={pust}
        onContextMenu={(e) => e.preventDefault()}
        aria-label="Podržením zobrazíš svou roli"
        style={{
          minHeight: 86, flexShrink: 0, borderRadius: 999,
          border: `3px ${drzim ? 'solid' : 'dashed'} ${drzim ? 'var(--rez-400)' : 'var(--ram)'}`,
          background: drzim ? 'rgba(232,139,69,0.12)' : 'transparent',
          color: drzim ? 'var(--text-akcent)' : 'var(--text-tlum)',
          fontFamily: 'var(--font-nadpis)', fontSize: 17, letterSpacing: '0.2em',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          touchAction: 'none',
        }}
      >
        {drzim ? 'PUSŤ A ZAKRYJE SE' : 'PODRŽ ZDE'}
      </button>

      <Tlacitko
        druh={videl && !pripraven ? 'hlavni' : 'tichy'}
        vyska={74}
        onClick={videl && !pripraven ? onPripraven : undefined}
      >
        {pripraven ? 'ČEKÁ SE NA OSTATNÍ' : 'JSEM PŘIPRAVEN'}
      </Tlacitko>
    </Obrazovka>
  );
}

// ---------------------------------------------------------------- čeká se

export function CekaSe({ hraci, hotovi, podil, onPreskocit, onTvaRole, popis }: {
  hraci: Hrac[]; hotovi: HracId[]; podil: number; onPreskocit?: () => void; onTvaRole?: () => void; popis: string;
}) {
  return (
    <Obrazovka>
      <Hlavicka
        nadpis="ČEKÁ SE"
        vpravo={
          <span style={{ fontFamily: 'var(--font-nadpis)', fontSize: 19, color: 'var(--text-akcent)' }}>
            {hotovi.length} / {hraci.length}
          </span>
        }
      />
      <Poznamka>{popis}</Poznamka>

      <Rostouci style={{ gap: 8 }}>
        {hraci.map((h) => {
          const hotovy = hotovi.includes(h.id);
          return (
            <RadekHrace
              key={h.id}
              jmeno={h.jmeno.toUpperCase()}
              stav={hotovy ? 'hotovo' : 'cekame'}
              vpravo={hotovy ? <Fajfka /> : <Stitek tlumeny>ROZMÝŠLÍ SE</Stitek>}
            />
          );
        })}
      </Rostouci>

      {onTvaRole && (
        <Blok style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
          <span style={{ fontSize: 'var(--t-meta-size)', fontWeight: 600, color: 'var(--text-tlum)' }}>Zapomněl jsi, co jsi?</span>
          <button type="button" onClick={onTvaRole} style={{ border: 'none', background: 'none', padding: '8px 0', fontFamily: 'var(--font-nadpis)', fontSize: 16, letterSpacing: '0.12em', color: 'var(--text-akcent)' }}>
            TVÁ ROLE
          </button>
        </Blok>
      )}

      <Ukazatel podil={podil} onPreskocit={onPreskocit} />
    </Obrazovka>
  );
}
