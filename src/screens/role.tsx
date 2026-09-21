import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import {
  Fajfka, Hlavicka, Obrazovka, Poznamka, Popisek, RadekHrace,
  Rostouci, Stitek, Tlacitko, Ukazatel, Zamek,
} from '../ui/primitives';
import type { HracId, Role } from '../game/types';

interface Spolu { id: HracId; jmeno: string; predak: boolean }

/**
 * Odkrytí role držením. Zobrazí se, jen dokud prst (nebo mezerník) drží.
 * Sdílí ho obrazovka Tvá role a připomínka v přehledu.
 */
export function OdkrytiRole({ role, spoluSaboteri, jsemPredak, pocetSaboteru, onVidel }: {
  role: Role | null; spoluSaboteri: Spolu[]; jsemPredak: boolean; pocetSaboteru: number;
  onVidel?: () => void;
}) {
  const [drzim, setDrzim] = useState(false);

  const drz = () => { setDrzim(true); onVidel?.(); };
  const pust = () => setDrzim(false);
  const klavesa = (e: KeyboardEvent, dolu: boolean) => {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault();
    if (dolu && !e.repeat) drz();
    if (!dolu) pust();
  };

  return (
    <>
      <div
        style={{
          flexGrow: 1, minHeight: 0, border: 'var(--ram-akce) solid var(--ram)',
          display: 'flex', flexDirection: 'column', justifyContent: 'safe center',
          gap: 20, padding: 24, overflowY: 'auto',
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
                    {jsemPredak ? 'V noci rozhoduješ ty, ostatní navrhují.' : 'V noci navrhuješ, rozhoduje předák.'}
                    {' '}Na šichtě smíš kazit. Stůl se dozví jen, kolik lidí kazilo.
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
                    {pocetSaboteru} z vás kazí. Na šichtě umíš jen makat. Najdi je dřív, než dojdou šichty.
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
        data-mereni="odkryt-roli"
        onPointerDown={drz}
        onPointerUp={pust}
        onPointerLeave={pust}
        onPointerCancel={pust}
        onKeyDown={(e) => klavesa(e, true)}
        onKeyUp={(e) => klavesa(e, false)}
        onBlur={pust}
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
    </>
  );
}

/**
 * Jediná obrazovka ve hře, která se zakrývá. Odkryje se, jen dokud držíš prst.
 * Jinde to nemá smysl: tam se mačkají tlačítka a obě role vidí totéž.
 */
export function TvaRole({
  role, spoluSaboteri, jsemPredak, pocetHracu, pocetSaboteru, pripraven, pripravenych, onPripraven,
}: {
  role: Role | null;
  spoluSaboteri: Spolu[];
  jsemPredak: boolean;
  pocetHracu: number;
  pocetSaboteru: number;
  pripraven: boolean;
  /** Kolik lidí už potvrdilo. Online se čeká na všechny. */
  pripravenych: number;
  onPripraven: () => void;
}) {
  const [videl, setVidel] = useState(false);

  return (
    <Obrazovka zare>
      <Hlavicka
        nadpis="TVÁ ROLE"
        akcent
        vpravo={<Stitek tlumeny>{pocetHracu} HRÁČŮ · {pocetSaboteru} {pocetSaboteru === 1 ? 'SABOTÉR' : 'SABOTÉŘI'}</Stitek>}
      />

      <OdkrytiRole
        role={role} spoluSaboteri={spoluSaboteri} jsemPredak={jsemPredak}
        pocetSaboteru={pocetSaboteru} onVidel={() => setVidel(true)}
      />

      <Tlacitko
        druh={videl && !pripraven ? 'hlavni' : 'tichy'}
        vyska={74}
        onClick={videl && !pripraven ? onPripraven : undefined}
      >
        {pripraven ? `ČEKÁ SE NA OSTATNÍ · ${pripravenych} / ${pocetHracu}` : 'JDU NA TO'}
      </Tlacitko>
    </Obrazovka>
  );
}

// ---------------------------------------------------------------- čeká se

export function CekaSe({ hraci, hotovi, podil, onPreskocit, popis }: {
  hraci: { id: HracId; jmeno: string; pripojeny?: boolean }[]; hotovi: HracId[];
  podil: number; onPreskocit?: () => void; popis: string;
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
          const pryc = h.pripojeny === false && !hotovy;
          return (
            <RadekHrace
              key={h.id}
              jmeno={h.jmeno.toUpperCase()}
              stav={hotovy ? 'hotovo' : pryc ? 'pryc' : 'cekame'}
              vpravo={hotovy ? <Fajfka /> : <Stitek tlumeny>{pryc ? 'BEZ SPOJENÍ' : 'ROZMÝŠLÍ SE'}</Stitek>}
            />
          );
        })}
      </Rostouci>

      <Ukazatel podil={podil} onPreskocit={onPreskocit} />
    </Obrazovka>
  );
}
