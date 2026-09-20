import {
  Blok, Hlavicka, Obrazovka, Odpocet, Poznamka, Popisek, Razitko,
  Rostouci, Stitek, Tlacitko, Ukazatel, Veta,
} from '../ui/primitives';
import type { Smena } from '../game/types';

const NAZEV_SMENY: Record<Smena, string> = { dopoledni: 'DOPOLEDNÍ', odpoledni: 'ODPOLEDNÍ' };

// ---------------------------------------------------------------- předěl

export function Predel({ kolo, smena, zbyvaSicht, onDal }: {
  kolo: number; smena: Smena; zbyvaSicht: number; onDal: () => void;
}) {
  return (
    <Obrazovka tmava rez>
      <button
        type="button" onClick={onDal} aria-label="Pokračovat"
        style={{
          flexGrow: 1, border: 'none', background: 'none', padding: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 26, animation: 'vyjet 300ms ease-out',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.34em', color: 'var(--text-tlum)' }}>ZAČÍNÁ</span>
          <span style={{ fontFamily: 'var(--font-nadpis)', fontSize: 86, lineHeight: 0.9, letterSpacing: '0.03em', color: 'var(--ocel-50)' }}>ŠICHTA</span>
          <span style={{ fontFamily: 'var(--font-nadpis)', fontSize: 136, lineHeight: 0.84, color: 'var(--text-akcent)' }}>{kolo}</span>
        </div>

        <div style={{ width: 140, height: 4, background: 'var(--ram)' }} />
        <span style={{ fontFamily: 'var(--font-nadpis)', fontSize: 25, letterSpacing: '0.3em', color: 'var(--text)' }}>
          {NAZEV_SMENY[smena]}
        </span>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9, marginTop: 4 }}>
          <div style={{ display: 'flex', gap: 7 }}>
            {Array.from({ length: kolo + zbyvaSicht }, (_, i) => (
              <div key={i} style={{ width: 40, height: 6, background: i < kolo ? 'var(--rez-400)' : 'var(--ram-tlum)' }} />
            ))}
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.16em', color: 'var(--text-tlum)' }}>
            {zbyvaSicht === 0 ? 'POSLEDNÍ ŠICHTA' : zbyvaSicht === 1 ? 'ZBÝVÁ POSLEDNÍ ŠICHTA' : `ZBÝVAJÍ ${zbyvaSicht} ŠICHTY`}
          </span>
        </div>
      </button>
    </Obrazovka>
  );
}

// ---------------------------------------------------------------- zadání

export function Zadani({ kolo, smena, parta, zustavaji, jsemVParte, podil, onPreskocit }: {
  kolo: number; smena: Smena; parta: string[]; zustavaji: string[];
  /** Na jednom telefonu vždy false: tohle je obrazovka stolu, nesmí nikoho vypíchnout. */
  jsemVParte: boolean;
  podil: number; onPreskocit?: () => void;
}) {
  return (
    <Obrazovka>
      <Hlavicka nadpis={`ŠICHTA ${kolo}`} vpravo={<Stitek tlumeny>{NAZEV_SMENY[smena]}</Stitek>} />
      <Popisek>NA ŠICHTU JDOU</Popisek>

      <Rostouci style={{ gap: 9 }}>
        {parta.map((j, i) => (
          <div
            key={j}
            style={{
              border: `var(--ram-akce) solid ${jsemVParte && i === parta.length - 1 ? 'var(--rez-400)' : 'var(--ram-silny)'}`,
              background: 'var(--blok)', padding: '15px 16px', flexShrink: 0,
              fontFamily: 'var(--font-nadpis)', fontSize: 26, letterSpacing: '0.03em',
              animation: `vyjet 200ms ease-out ${i * 60}ms both`,
            }}
          >
            {j.toUpperCase()}
          </div>
        ))}

        {zustavaji.length > 0 && (
          <div style={{ marginTop: 8, borderTop: '2px solid var(--ram-tlum)', paddingTop: 12 }}>
            <Popisek>ZŮSTÁVAJÍ</Popisek>
            <div style={{ marginTop: 9, display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {zustavaji.map((j) => (
                <span key={j} style={{ fontFamily: 'var(--font-nadpis)', fontSize: 17, border: '2px solid var(--ram-tlum)', color: 'var(--ocel-400)', padding: '6px 10px' }}>
                  {j.toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        )}
      </Rostouci>

      <Poznamka>Tohle vidí celý stůl. Zapamatujte si to, po rozpravě se na to bude ptát každý.</Poznamka>
      <Ukazatel podil={podil} onPreskocit={onPreskocit} />
    </Obrazovka>
  );
}

// ---------------------------------------------------------------- tajná volba

/**
 * Tajná volba na šichtě.
 *
 * Pravidlo o tom, že pracant kazit neumí, je napsané rovnou na obrazovce,
 * a to všem stejně. Dřív se pracantovi volba mlčky přepsala na MAKAT, což
 * vypadalo jako rozbitá appka. Říct to dopředu nic neprozradí: sabotér
 * i pracant čtou tutéž větu.
 *
 * Po odevzdání se ukáže, co se doopravdy zapsalo. Obě role vidí stejně
 * postavenou obrazovku, jen s jiným slovem, a to jen na vlastním telefonu.
 */
export function Volba({ kolo, smena, parta, mojeJmeno, sekundy, odevzdano, onVolba, onHotovo }: {
  kolo: number; smena: Smena; parta: string[]; mojeJmeno: string;
  /** null na jednom telefonu: fázi tam nehlídají hodiny, telefon se podává. */
  sekundy: number | null;
  /** Co reducer zapsal. Dokud je null, ještě se nevolilo. */
  odevzdano: 'makat' | 'kazit' | null;
  onVolba: (v: 'makat' | 'kazit') => void;
  onHotovo: () => void;
}) {
  return (
    <Obrazovka rez>
      <Hlavicka nadpis={`ŠICHTA ${kolo}`} vpravo={<Stitek tlumeny>{NAZEV_SMENY[smena]}</Stitek>} />

      <Blok silny popisek="PARTA NA ŠICHTU">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {parta.map((j) => (
            <span
              key={j}
              style={{
                fontFamily: 'var(--font-nadpis)', fontSize: 22, letterSpacing: '0.03em',
                color: j === mojeJmeno ? 'var(--text-akcent)' : 'var(--text)',
                borderTop: j === mojeJmeno ? '3px solid var(--ram)' : undefined,
                paddingTop: j === mojeJmeno ? 10 : undefined,
              }}
            >
              {j.toUpperCase()}
            </span>
          ))}
        </div>
      </Blok>

      {odevzdano ? (
        <>
          <div style={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18 }}>
            <Razitko nadpis={odevzdano === 'kazit' ? 'KAZIT' : 'MAKAT'} popisek="ZAPSÁNO" />
            <Veta>Změnit to už nejde. Nikdo se nedozví, co tu bylo.</Veta>
          </div>
          <Tlacitko druh="hlavni" vyska={82} onClick={onHotovo}>HOTOVO</Tlacitko>
        </>
      ) : (
        <>
          <div style={{ flexGrow: 1, minHeight: 0, display: 'flex', alignItems: 'center' }}>
            <Veta>Vyber, co dnes odvedeš.<br />Nikdo se to nedozví.</Veta>
          </div>

          {/* Obě role vidí obě tlačítka úplně stejně. Zašedlé KAZIT by roli prozradilo přes stůl. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            <Tlacitko vyska={84} onClick={() => onVolba('makat')}>MAKAT</Tlacitko>
            <Tlacitko vyska={84} onClick={() => onVolba('kazit')}>KAZIT</Tlacitko>
          </div>

          <Poznamka>Kazit umí jen sabotér. Pracantovi se volba zapíše jako MAKAT.</Poznamka>
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '4px solid var(--ram)', paddingTop: 11 }}>
        <Stitek tlumeny>VOLBA JE TAJNÁ</Stitek>
        <Odpocet sekundy={sekundy} />
      </div>
    </Obrazovka>
  );
}

// ---------------------------------------------------------------- výsledek

export function Vysledek({ kolo, smena, padla, sabotazi, parta, mojeJmeno, podil, onPreskocit }: {
  kolo: number; smena: Smena; padla: boolean; sabotazi: number;
  parta: string[];
  /** null na jednom telefonu: výsledek čte celý stůl, nikdo tu není "ty". */
  mojeJmeno: string | null;
  podil: number; onPreskocit?: () => void;
}) {
  return (
    <Obrazovka>
      <Hlavicka nadpis={`ŠICHTA ${kolo}`} vpravo={<Stitek tlumeny>{NAZEV_SMENY[smena]}</Stitek>} />

      <div style={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20 }}>
        <Razitko nadpis={padla ? 'PADLA' : 'PROŠLA'} popisek="VÝSLEDEK" barva={padla ? 'padlo' : 'proslo'} />

        {padla && (
          <Blok silny style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Popisek>KAZILI</Popisek>
            <span style={{ fontFamily: 'var(--font-nadpis)', fontSize: 42, lineHeight: 1, color: 'var(--text-akcent)' }}>{sabotazi}</span>
          </Blok>
        )}

        <div style={{ fontSize: 'var(--t-prose-size)', lineHeight: 'var(--t-prose-lh)', color: 'var(--text)' }}>
          {padla
            ? sabotazi === 1
              ? `Jeden z téhle party šichtu položil. Je mezi těmi ${parta.length} níž.`
              : `${sabotazi} lidi z téhle party šichtu položili. Všichni jsou mezi těmi ${parta.length} níž.`
            : 'Nikdo z téhle party dnes nekazil. Aspoň ne tak, aby to bylo poznat.'}
        </div>
      </div>

      <Blok popisek="BYLI NA ŠICHTĚ">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {parta.map((j) => (
            <span
              key={j}
              style={{
                fontFamily: 'var(--font-nadpis)', fontSize: 18, padding: '6px 10px',
                border: `2px solid ${j === mojeJmeno ? 'var(--rez-400)' : 'var(--ram-silny)'}`,
                color: j === mojeJmeno ? 'var(--text-akcent)' : 'var(--text)',
              }}
            >
              {j.toUpperCase()}
            </span>
          ))}
        </div>
      </Blok>

      <Ukazatel podil={podil} onPreskocit={onPreskocit} />
    </Obrazovka>
  );
}

// ---------------------------------------------------------------- šeptanda

/**
 * Šeptanda je soukromá: každý má jinou větu a nikdo ji nemůže ověřit.
 * Text pod ní je nejdůležitější věta na téhle obrazovce. Bez ní se rozprava
 * zvrhne na výslech "ukaž, co ti přišlo", a kdo nemá co ukázat, je hned
 * sabotér. S ní je vymýšlení si legitimní tah.
 */
export function Septanda({ text, onHotovo }: { text: string; onHotovo: () => void }) {
  return (
    <Obrazovka tmava>
      <Hlavicka nadpis="ŠEPTANDA" vpravo={<Stitek tlumeny>JEN PRO TEBE</Stitek>} />

      <div style={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 22 }}>
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 2a7 7 0 0 0-7 7c0 2.4 1.2 4 2.4 5.3.6.7.9 1.3.9 2.2V17h7.4v-.5c0-.9.3-1.5.9-2.2C17.8 13 19 11.4 19 9a7 7 0 0 0-7-7Z" stroke="var(--rez-400)" strokeWidth="2" />
          <path d="M9.5 20.5h5M10 22.5h4" stroke="var(--rez-400)" strokeWidth="2" strokeLinecap="round" />
        </svg>

        <div style={{
          fontFamily: 'var(--font-nadpis)', fontSize: 30, lineHeight: 1.16,
          color: 'var(--ocel-50)', animation: 'vyjet 300ms ease-out',
        }}>
          {text.toUpperCase()}
        </div>

        <Poznamka>
          Tvoje věta je pravdivá. Každý u stolu dostal jinou a nikdo si tu cizí
          neověří. Sabotéři dostali taky svou, takže si klidně vymyslí jinou.
          Říct ji nahlas, zamlčet, nebo zalhat, je na tobě.
        </Poznamka>
      </div>

      <Tlacitko druh="hlavni" vyska={82} onClick={onHotovo}>PŘEČTENO</Tlacitko>
    </Obrazovka>
  );
}
