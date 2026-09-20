import { useState } from 'react';
import {
  Blok, Fajfka, Hlavicka, Obrazovka, Poznamka, Popisek, RadekHrace,
  Rostouci, Stitek, Tlacitko, Veta, Znacka, Zpet,
} from '../ui/primitives';
import { MAX_HRACU, MIN_HRACU, sestavaPro } from '../game/rules';
import { ABECEDA_KODU, DELKA_KODU } from '../game/kod';
import { jeDivokaSestava } from '../game/rules';

// ---------------------------------------------------------------- úvod

export function Uvod({ siteDostupna, chyba, onZalozit, onPripojit, onHotSeat, onPravidla }: {
  siteDostupna: boolean; chyba?: string | null;
  onZalozit: () => void; onPripojit: () => void; onHotSeat: () => void; onPravidla: () => void;
}) {
  return (
    <Obrazovka rez>
      <div style={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 24 }}>
        <Znacka velikost={96} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--font-nadpis)', fontSize: 72, lineHeight: 0.88, letterSpacing: '0.04em', color: 'var(--ocel-50)' }}>
            ŠICHTA
          </span>
          <Stitek tlumeny>PRACANTI VS. SABOTÉŘI</Stitek>
        </div>
      </div>

      {chyba && <Poznamka varovna>{chyba}</Poznamka>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {siteDostupna ? (
          <>
            <Tlacitko druh="hlavni" onClick={onZalozit} vyska={78}>ZALOŽIT ŠICHTU</Tlacitko>
            <Tlacitko onClick={onPripojit} vyska={78}>PŘIPOJIT SE</Tlacitko>
            <Tlacitko druh="tichy" onClick={onHotSeat} vyska={58} male>JEN NA JEDNOM TELEFONU</Tlacitko>
          </>
        ) : (
          <>
            <Tlacitko druh="hlavni" onClick={onHotSeat} vyska={82} male>HRÁT NA JEDNOM TELEFONU</Tlacitko>
            <Poznamka>Hra po síti zatím není nastavená. Telefon si budete podávat dokola.</Poznamka>
          </>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '3px solid var(--ram)', paddingTop: 15 }}>
        <span style={{ fontSize: 'var(--t-meta-size)', fontWeight: 600, color: 'var(--text-tlum)' }}>
          {MIN_HRACU} až {MAX_HRACU} hráčů
        </span>
        <button type="button" onClick={onPravidla} style={{ border: 'none', background: 'none', padding: '8px 0', fontSize: 'var(--t-meta-size)', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-akcent)' }}>
          PRAVIDLA
        </button>
      </div>
    </Obrazovka>
  );
}

// ---------------------------------------------------------------- přezdívka

const NAVRHY = ['MISTR', 'NOČNÍ', 'SVÁŘEČ', 'VRÁTNÝ', 'KOTELNÍK', 'PŘESČAS'];

export function Prezdivka({ vychozi, onHotovo, onZpet, onPravidla }: {
  vychozi?: string; onHotovo: (jmeno: string) => void; onZpet: () => void; onPravidla: () => void;
}) {
  const [jmeno, setJmeno] = useState(vychozi ?? '');
  const platne = jmeno.trim().length > 0;

  return (
    <Obrazovka>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, borderBottom: '3px solid var(--ram)', paddingBottom: 12 }}>
        <Zpet onClick={onZpet} />
        <h1 style={{ margin: 0, flexGrow: 1, fontFamily: 'var(--font-nadpis)', fontWeight: 400, fontSize: 26, letterSpacing: '0.05em' }}>
          JAK TI ŘÍKAT
        </h1>
        <button type="button" onClick={onPravidla} style={{ border: 'none', background: 'none', padding: '8px 0', fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', color: 'var(--text-akcent)' }}>
          PRAVIDLA
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label htmlFor="prezdivka"><Popisek>PŘEZDÍVKA</Popisek></label>
        <input
          id="prezdivka" type="text" value={jmeno} maxLength={12} autoComplete="nickname"
          onChange={(e) => setJmeno(e.target.value)}
          style={{
            width: '100%', minHeight: 82, padding: '0 18px',
            border: 'var(--ram-akce) solid var(--rez-400)', background: 'rgba(0,0,0,0.25)',
            color: 'var(--ocel-50)', fontFamily: 'var(--font-nadpis)', fontSize: 34, letterSpacing: '0.04em',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: 'var(--text-tlum)' }}>
          <span>Uvidí ji celý stůl. Stejná se rozliší číslem.</span>
          <span style={{ fontFamily: 'var(--font-nadpis)' }}>{jmeno.length} / 12</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        <Popisek>NEBO SI VEM JEDNU Z TĚCHHLE</Popisek>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {NAVRHY.map((n) => (
            <button
              key={n} type="button" onClick={() => setJmeno(n)}
              style={{
                minHeight: 44, padding: '11px 14px',
                border: 'var(--ram-blok) solid var(--ram)', background: 'var(--blok)',
                color: 'var(--text)', fontFamily: 'var(--font-nadpis)', fontSize: 17, letterSpacing: '0.04em',
              }}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <Rostouci style={{ justifyContent: 'flex-end' }}>
        <Poznamka>Ber takovou, na kterou se dá zavolat přes stůl. Budete na sebe celý večer křičet.</Poznamka>
      </Rostouci>

      <Tlacitko druh={platne ? 'hlavni' : 'tichy'} vyska={82} onClick={platne ? () => onHotovo(jmeno.trim()) : undefined}>
        DO ŠATNY
      </Tlacitko>
    </Obrazovka>
  );
}

// ---------------------------------------------------------------- šatna

export interface HracVSatne { id: string; jmeno: string; zakladatel: boolean; pripojeny: boolean }

export function Satna({
  kod, odkaz, hraci, jaId, jsemZakladatel, onZacit, onNastaveni, onNastaveniHry, onPravidla, onVyhodit, popisekAkce = 'NASTAVENÍ',
}: {
  kod: string; odkaz?: string | null; hraci: HracVSatne[]; jaId: string | null; jsemZakladatel: boolean;
  onZacit: () => void; onNastaveni?: () => void; onNastaveniHry: () => void; onPravidla: () => void;
  /** Jen zakladatel a jen online: vyhodit hráče, který tu nemá co dělat. */
  onVyhodit?: (id: string) => void;
  popisekAkce?: string;
}) {
  const pritomni = hraci.filter((h) => h.pripojeny);
  const dost = pritomni.length >= MIN_HRACU;
  const sestava = dost ? sestavaPro(pritomni.length) : null;
  const [poslano, setPoslano] = useState(false);

  // Kód jde přečíst nahlas, ale odkaz je rychlejší. Systémové sdílení má
  // každý telefon, schránka je záloha pro prohlížeče, co ho neumí.
  const poslatOdkaz = async () => {
    if (!odkaz) return;
    try {
      if (navigator.share) await navigator.share({ title: 'Šichta', text: `Kód šichty: ${kod}`, url: odkaz });
      else await navigator.clipboard.writeText(odkaz);
      setPoslano(true);
      setTimeout(() => setPoslano(false), 2200);
    } catch {
      // zavřené sdílení není chyba, člověk si to rozmyslel
    }
  };

  return (
    <Obrazovka>
      <Hlavicka
        nadpis="ŠATNA"
        vpravo={
          <span style={{ display: 'flex', gap: 14 }}>
            <button type="button" onClick={onPravidla} style={{ border: 'none', background: 'none', padding: '8px 0', fontSize: 12, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--text-tlum)' }}>
              PRAVIDLA
            </button>
            {jsemZakladatel && onNastaveni && (
              <button type="button" onClick={onNastaveni} style={{ border: 'none', background: 'none', padding: '8px 0', fontSize: 12, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--text-akcent)' }}>
                {popisekAkce}
              </button>
            )}
          </span>
        }
      />

      <Blok silny style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <Popisek>KÓD ŠICHTY</Popisek>
          <span style={{ fontFamily: 'var(--font-nadpis)', fontSize: 40, lineHeight: 1, letterSpacing: '0.12em', color: 'var(--text-akcent)' }}>
            {kod}
          </span>
        </div>
        {odkaz && (
          <button
            type="button" onClick={poslatOdkaz}
            style={{
              flexShrink: 0, minHeight: 52, padding: '0 15px',
              border: '3px solid var(--ram)', background: 'var(--blok)',
              fontFamily: 'var(--font-nadpis)', fontSize: 14, letterSpacing: '0.1em',
              color: poslano ? 'var(--patina-400)' : 'var(--text)',
            }}
          >
            {poslano ? 'HOTOVO' : 'POSLAT'}
          </button>
        )}
      </Blok>

      <Blok style={{ flexGrow: 1, minHeight: 0, overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Popisek>SEŠLI SE</Popisek>
          <span style={{ fontFamily: 'var(--font-nadpis)', fontSize: 19, color: 'var(--text-akcent)' }}>
            {pritomni.length} / {MAX_HRACU}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {hraci.map((h) => (
            <RadekHrace
              key={h.id} jmeno={h.jmeno.toUpperCase()}
              stav={!h.pripojeny ? 'pryc' : h.id === jaId ? 'ty' : 'hotovo'}
              vpravo={
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {!h.pripojeny ? <Stitek tlumeny>ODPOJEN</Stitek> : h.zakladatel ? <Stitek>ZAKLADATEL</Stitek> : <Fajfka />}
                  {onVyhodit && jsemZakladatel && h.id !== jaId && (
                    <button
                      type="button" onClick={() => onVyhodit(h.id)} aria-label={`Vyhodit ${h.jmeno}`}
                      style={{ width: 44, height: 44, border: '2px solid var(--ram-tlum)', background: 'transparent', color: 'var(--ocel-400)', fontFamily: 'var(--font-nadpis)', fontSize: 18 }}
                    >
                      ×
                    </button>
                  )}
                </span>
              }
            />
          ))}
          {!dost && <RadekHrace jmeno="ČEKÁ SE" stav="cekame" />}
        </div>
      </Blok>

      {dost && jeDivokaSestava(pritomni.length) && (
        <Poznamka varovna>
          Pětka je tréninková partie. Kazí jen jeden, může se stát, že ho najdete
          hned, a vyvážit to nejde. Od šesti hráčů se hra pořádně rozjede.
        </Poznamka>
      )}

      {sestava && (
        <Blok style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 'var(--t-meta-size)', fontWeight: 600, color: 'var(--text)' }}>
            {pritomni.length} hráčů
          </span>
          <span style={{ fontFamily: 'var(--font-nadpis)', fontSize: 16, letterSpacing: '0.06em', color: 'var(--text-akcent)' }}>
            {sestava.saboteri} SAB · {sestava.limitSicht} ŠICHT
          </span>
        </Blok>
      )}

      {jsemZakladatel ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <Tlacitko druh={dost ? 'hlavni' : 'tichy'} vyska={82} onClick={dost ? onZacit : undefined}>
            {dost ? 'ZAČÍT ŠICHTU' : `CHYBÍ ${MIN_HRACU - pritomni.length}`}
          </Tlacitko>
          <Tlacitko druh="tichy" vyska={56} onClick={onNastaveniHry}>NASTAVENÍ HRY</Tlacitko>
        </div>
      ) : (
        <Veta>Až vás bude dost, zakladatel šichtu spustí.</Veta>
      )}
    </Obrazovka>
  );
}

// ---------------------------------------------------------------- kód šichty

export function KodSichty({ onHotovo, onZpet, chyba }: {
  onHotovo: (kod: string) => void; onZpet: () => void; chyba?: string | null;
}) {
  const [kod, setKod] = useState('');
  const platny = kod.length === DELKA_KODU;
  const znaky = Array.from({ length: DELKA_KODU }, (_, i) => kod[i] ?? null);

  const pridat = (z: string) => setKod((k) => (k.length < DELKA_KODU ? k + z : k));
  const smazat = () => setKod((k) => k.slice(0, -1));

  return (
    <Obrazovka>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, borderBottom: '3px solid var(--ram)', paddingBottom: 12 }}>
        <Zpet onClick={onZpet} />
        <h1 style={{ margin: 0, fontFamily: 'var(--font-nadpis)', fontWeight: 400, fontSize: 26, letterSpacing: '0.05em' }}>
          KÓD ŠICHTY
        </h1>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        {znaky.map((z, i) => (
          <div
            key={i}
            style={{
              flex: '1 1 0', minWidth: 0, height: 66,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `3px solid ${z ? 'var(--rez-400)' : i === kod.length ? 'var(--ram-silny)' : 'var(--ram-tlum)'}`,
              background: z ? 'rgba(0,0,0,0.25)' : 'transparent',
              fontFamily: 'var(--font-nadpis)', fontSize: 30, color: 'var(--ocel-50)',
            }}
          >
            {z ?? ''}
          </div>
        ))}
      </div>

      {chyba && <Poznamka varovna>{chyba}</Poznamka>}

      <div style={{ flexGrow: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8, alignContent: 'end' }}>
        {[...ABECEDA_KODU].map((z) => (
          <button key={z} type="button" onClick={() => pridat(z)}
            style={{ minHeight: 56, border: '3px solid var(--ram)', background: 'var(--blok)', color: 'var(--ocel-50)', fontFamily: 'var(--font-nadpis)', fontSize: 22 }}>
            {z}
          </button>
        ))}
        <button type="button" onClick={smazat} aria-label="Smazat"
          style={{ gridColumn: '1 / -1', minHeight: 56, border: '3px solid var(--ram)', background: 'var(--blok)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="24" height="18" viewBox="0 0 24 18" fill="none" aria-hidden="true">
            <path d="M8 1h14v16H8L1 9z" stroke="var(--text)" strokeWidth="2" />
            <path d="M12 6l6 6M18 6l-6 6" stroke="var(--text)" strokeWidth="2" />
          </svg>
        </button>
      </div>

      <Tlacitko druh={platny ? 'hlavni' : 'tichy'} vyska={82} onClick={platny ? () => onHotovo(kod) : undefined}>
        {platny ? 'PŘIPOJIT SE' : 'ŠEST ZNAKŮ'}
      </Tlacitko>
    </Obrazovka>
  );
}

// ---------------------------------------------------------------- spojení

export function Pripojuji({ kod, stav, onZpet }: { kod: string; stav: string; onZpet: () => void }) {
  const odpojen = stav === 'odpojen';
  return (
    <Obrazovka tmava>
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 24, textAlign: 'center' }}>
        <Znacka velikost={64} />
        <div style={{ fontFamily: 'var(--font-nadpis)', fontSize: 40, letterSpacing: '0.12em', color: 'var(--text-akcent)' }}>{kod}</div>
        <div style={{ fontFamily: 'var(--font-nadpis)', fontSize: 24, letterSpacing: '0.16em' }}>
          {odpojen ? 'SPOJENÍ SPADLO' : 'PŘIPOJUJI SE'}
        </div>
        <div style={{ fontSize: 'var(--t-prose-size)', lineHeight: 1.6, color: 'var(--text-tlum)', maxWidth: 260 }}>
          {odpojen
            ? 'Zkouším to znovu. Nikam neodcházej, hra stojí na serveru a nic se neztratilo.'
            : 'Moment.'}
        </div>
      </div>
      <Tlacitko vyska={76} onClick={onZpet}>ZPĚT</Tlacitko>
    </Obrazovka>
  );
}

const DUVODY: Record<string, string> = {
  'hra-bezi': 'Tahle šichta už začala. Do rozehrané partie se nedá přidat, počkej na další.',
  plno: 'Šichta je plná. Víc než dvanáct lidí se ke stolu nevejde.',
  jmeno: 'Bez přezdívky to nejde. Vrať se a nějakou si vyber.',
};

/** Server nás nepustil dovnitř. Neopakuje se to, dokud člověk nezmění, co udělal. */
export function Nepustili({ kod, duvod, onZpet }: { kod: string; duvod: string; onZpet: () => void }) {
  return (
    <Obrazovka tmava>
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 24, textAlign: 'center' }}>
        <Znacka velikost={64} />
        <div style={{ fontFamily: 'var(--font-nadpis)', fontSize: 40, letterSpacing: '0.12em', color: 'var(--text-akcent)' }}>{kod}</div>
        <div style={{ fontFamily: 'var(--font-nadpis)', fontSize: 24, letterSpacing: '0.16em' }}>TUDY NE</div>
        <div style={{ fontSize: 'var(--t-prose-size)', lineHeight: 1.6, color: 'var(--text)', maxWidth: 280 }}>
          {DUVODY[duvod] ?? 'Server šichty odmítl připojení.'}
        </div>
      </div>
      <Tlacitko druh="hlavni" vyska={76} onClick={onZpet}>ZPĚT NA ÚVOD</Tlacitko>
    </Obrazovka>
  );
}
