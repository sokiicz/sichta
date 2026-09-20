import {
  Blok, Fajfka, Hlavicka, Obrazovka, Odpocet, Poznamka, Popisek, RadekHrace,
  Razitko, Rostouci, Stitek, Tlacitko, Ukazatel, Veta, Volba,
} from '../ui/primitives';
import type { Odmena } from '../game/types';
import type { Kdo } from './rada';

const POPIS: Record<Odmena, { nadpis: string; text: string }> = {
  vrazda: { nadpis: 'VRAŽDA', text: 'Jeden hráč dnes v noci končí. Příští noc už vražda nepůjde, dvakrát po sobě to nejde.' },
  imunita: { nadpis: 'IMUNITA', text: 'Kdokoliv podle tvé volby nemůže být v nejbližší radě vyhoštěn. I pracant.' },
  tma: { nadpis: 'TMA', text: 'U nejbližší rady se neukáže, kdo koho volil.' },
};

// ---------------------------------------------------------------- odměna

export function Odmeny({ dostupne, vybrana, onVybrat, onPotvrdit }: {
  dostupne: Odmena[]; vybrana: Odmena | null;
  onVybrat: (o: Odmena) => void; onPotvrdit: () => void;
}) {
  const vse: Odmena[] = ['vrazda', 'imunita', 'tma'];
  return (
    <Obrazovka tmava>
      <Hlavicka nadpis="NOC" vpravo={<Stitek>JSI PŘEDÁK</Stitek>} />
      <Veta>Šichta padla. Vyber si, co si za to vezmete.</Veta>

      <Rostouci style={{ gap: 11 }}>
        {vse.map((o) => {
          const lze = dostupne.includes(o);
          const zvoleno = vybrana === o;
          return (
            <button
              key={o} type="button" disabled={!lze}
              onClick={() => onVybrat(o)} aria-pressed={zvoleno}
              style={{
                width: '100%', flexShrink: 0, padding: 16, textAlign: 'left',
                display: 'flex', flexDirection: 'column', gap: 6,
                border: `var(--ram-akce) solid ${zvoleno ? 'var(--rez-400)' : lze ? 'var(--ram-silny)' : 'var(--ram-tlum)'}`,
                background: zvoleno ? 'rgba(232,139,69,0.14)' : lze ? 'var(--blok-tlac)' : 'transparent',
              }}
            >
              <span style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontFamily: 'var(--font-nadpis)', fontSize: 26, letterSpacing: '0.04em',
                color: zvoleno ? 'var(--text-akcent)' : lze ? 'var(--ocel-50)' : 'var(--ocel-400)',
              }}>
                {POPIS[o].nadpis}
                {!lze && <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', border: '2px solid var(--ram-tlum)', padding: '4px 8px' }}>NEJDE</span>}
              </span>
              <span style={{ fontFamily: 'var(--font-text)', fontSize: 'var(--t-meta-size)', lineHeight: 1.5, color: lze ? 'var(--text)' : 'var(--ocel-400)' }}>
                {lze ? POPIS[o].text : 'Vraždili jste minulou noc. Dvakrát po sobě to nejde.'}
              </span>
            </button>
          );
        })}
      </Rostouci>

      <Poznamka>Ostatní sabotéři uvidí, co jsi vybral. Stůl ne.</Poznamka>

      <Tlacitko druh={vybrana ? 'hlavni' : 'tichy'} vyska={78} onClick={vybrana ? onPotvrdit : undefined}>
        {vybrana ? `VZÍT ${POPIS[vybrana].nadpis}` : 'VYBER SI'}
      </Tlacitko>
    </Obrazovka>
  );
}

// ---------------------------------------------------------------- oběť

export function Obet({ cile, vybrany, sekundy, jsemPredak, odmena, onVybrat, onPotvrdit }: {
  cile: (Kdo & { spolusaboter?: boolean })[]; vybrany: string | null; sekundy: number | null;
  jsemPredak: boolean; odmena: Odmena; onVybrat: (id: string) => void; onPotvrdit: () => void;
}) {
  const cil = cile.find((c) => c.id === vybrany);
  return (
    <Obrazovka tmava>
      <Hlavicka nadpis="NOC" vpravo={<Odpocet sekundy={sekundy} />} />

      <Blok silny akcentni style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Popisek>PŘEDÁK VZAL</Popisek>
        <span style={{ fontFamily: 'var(--font-nadpis)', fontSize: 22, letterSpacing: '0.06em', color: 'var(--text-akcent)' }}>
          {POPIS[odmena].nadpis}
        </span>
      </Blok>

      <Veta>{jsemPredak ? 'Rozhoduješ ty. Návrhy ostatních vidíš u jmen.' : 'Navrhni, kdo má odejít. Rozhodne předák.'}</Veta>

      <Rostouci style={{ gap: 9 }}>
        {cile.map((c) => (
          <Volba
            key={c.id} zvoleno={c.id === vybrany} vypnuto={c.spolusaboter}
            onClick={() => onVybrat(c.id)}
            vpravo={c.spolusaboter ? <Stitek tlumeny>SABOTÉR</Stitek> : undefined}
          >
            {c.jmeno.toUpperCase()}
          </Volba>
        ))}
      </Rostouci>

      <Poznamka varovna>Zabít toho, komu stůl nejvíc věří, bolí nejvíc. Zabít toho, kdo tě tlačí, je nápadné.</Poznamka>

      <Tlacitko druh={cil ? 'hlavni' : 'tichy'} vyska={78} onClick={cil ? onPotvrdit : undefined}>
        {cil ? `${jsemPredak ? 'ROZHODNUTO' : 'NAVRHNOUT'}: ${cil.jmeno.toUpperCase()}` : 'VYBER JEDNOHO'}
      </Tlacitko>
    </Obrazovka>
  );
}

// ---------------------------------------------------------------- podezřelý

export function Podezrely({ cile, vybrany, sekundy, onVybrat, onPotvrdit }: {
  cile: Kdo[]; vybrany: string | null; sekundy: number | null;
  onVybrat: (id: string) => void; onPotvrdit: () => void;
}) {
  const cil = cile.find((c) => c.id === vybrany);
  return (
    <Obrazovka tmava>
      <Hlavicka nadpis="NOC" vpravo={<Odpocet sekundy={sekundy} />} />
      <Veta>Na koho to dnes vidíš? Tvůj tip se nikomu neukáže.</Veta>

      <Rostouci style={{ gap: 9 }}>
        {cile.map((c) => (
          <Volba key={c.id} zvoleno={c.id === vybrany} onClick={() => onVybrat(c.id)}>
            {c.jmeno.toUpperCase()}
          </Volba>
        ))}
      </Rostouci>

      <Blok style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="var(--rez-400)" strokeWidth="2" />
          <path d="M12 7v6M12 16.5v.5" stroke="var(--rez-400)" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span style={{ fontSize: 'var(--t-meta-size)', lineHeight: 1.5, color: 'var(--text)' }}>
          Na konci hry se sečte, kdo měl nejlepší čuch. Nemá to vliv na výsledek.
        </span>
      </Blok>

      <Tlacitko druh={cil ? 'hlavni' : 'tichy'} vyska={78} onClick={cil ? onPotvrdit : undefined}>
        {cil ? `ZAPSAT: ${cil.jmeno.toUpperCase()}` : 'VYBER JEDNOHO'}
      </Tlacitko>
    </Obrazovka>
  );
}

// ---------------------------------------------------------------- čeká se na noc

export function CekaNoc({ hraci, hotovi, sekundy, podil, onPreskocit }: {
  hraci: Kdo[]; hotovi: string[]; sekundy: number; podil: number; onPreskocit?: () => void;
}) {
  return (
    <Obrazovka tmava>
      <Hlavicka nadpis="NOC" vpravo={<Odpocet sekundy={sekundy} />} />

      <Blok silny akcentni style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
        <Fajfka />
        <span style={{ fontFamily: 'var(--font-nadpis)', fontSize: 21, letterSpacing: '0.05em', color: 'var(--text-akcent)' }}>ODESLÁNO</span>
      </Blok>

      <Blok style={{ flexGrow: 1, minHeight: 0, overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Popisek>ODEVZDALI</Popisek>
          <span style={{ fontFamily: 'var(--font-nadpis)', fontSize: 19, color: 'var(--text-akcent)' }}>
            {hotovi.length} / {hraci.length}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {hraci.map((h) => {
            const hotovy = hotovi.includes(h.id);
            return (
              <RadekHrace
                key={h.id} jmeno={h.jmeno.toUpperCase()} stav={hotovy ? 'hotovo' : 'cekame'}
                vpravo={hotovy ? <Fajfka /> : <Stitek tlumeny>ROZMÝŠLÍ SE</Stitek>}
              />
            );
          })}
        </div>
      </Blok>

      <Poznamka>Všichni odevzdávají něco, ať jsou kdokoliv. Z toho, jak dlouho to komu trvá, se nic nepozná.</Poznamka>
      <Ukazatel podil={podil} onPreskocit={onPreskocit} />
    </Obrazovka>
  );
}

// ---------------------------------------------------------------- ráno

export function Rano({ kolo, obet, zivych, stinu, zbyvaSicht, podil, onPreskocit }: {
  kolo: number; obet: string | null; zivych: number; stinu: number; zbyvaSicht: number; podil: number; onPreskocit?: () => void;
}) {
  return (
    <Obrazovka zare>
      <Hlavicka nadpis="RÁNO" vpravo={<Stitek tlumeny>PO ŠICHTĚ {kolo}</Stitek>} />

      <div style={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 22 }}>
        {obet ? (
          <>
            <Razitko nadpis={obet.toUpperCase()} popisek="DNES V NOCI" barva="padlo" naklon={-1.2} />
            <Poznamka>{obet} zůstává u stolu a mluví dál. Nesmí nominovat a má jeden hlas stínu na zbytek hry.</Poznamka>
          </>
        ) : (
          <>
            <Razitko nadpis="NIKDO" popisek="DNES V NOCI" naklon={-1.2} />
            <Poznamka>Noc proběhla v klidu. Což samo o sobě něco znamená.</Poznamka>
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: 11 }}>
        {[
          { p: 'ŽIVÝCH', v: zivych, akcent: false },
          { p: 'STÍNŮ', v: stinu, akcent: false },
          { p: 'ZBÝVÁ ŠICHT', v: zbyvaSicht, akcent: true },
        ].map((x) => (
          <div key={x.p} style={{ flexGrow: 1, border: `4px solid ${x.akcent ? 'var(--rez-400)' : 'var(--ram)'}`, padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', color: 'var(--text-tlum)' }}>{x.p}</div>
            <div style={{ fontFamily: 'var(--font-nadpis)', fontSize: 30, color: x.akcent ? 'var(--text-akcent)' : 'var(--text)' }}>{x.v}</div>
          </div>
        ))}
      </div>

      <Ukazatel podil={podil} onPreskocit={onPreskocit} />
    </Obrazovka>
  );
}
