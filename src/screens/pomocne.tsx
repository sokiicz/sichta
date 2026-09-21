import { useEffect, useState } from 'react';
import {
  Blok, Hlavicka, Obrazovka, Poznamka, Popisek, Rostouci,
  Stitek, Tlacitko, TlacitkoOpatrne, Veta, Volba, Zpet,
} from '../ui/primitives';
import { prepnoutZvuk, zvukZapnuty } from '../ui/zvuk';
import { zaznamenat } from '../ui/telemetrie';
import { MAX_HRACU, MIN_HRACU, sestavaPro } from '../game/rules';

// ---------------------------------------------------------------- pravidla

/**
 * Pravidla v appce jsou úplná, ne zkrácená. Hra má být férová jen díky
 * strategii a argumentaci, ne díky tomu, kdo zná pravidla líp. Proto si je
 * každý může projít na svém telefonu před hrou i během ní (z přehledu).
 * Delší verze s příklady je v docs/jak-hrat.md.
 */

interface Karta {
  nadpis: string;
  text?: string;
  /** Kroky pod textem, například průběh kola. */
  kroky?: string[];
  /** Kroky jdou po sobě a číslují se. Jinak je to jen výčet. */
  cislovane?: boolean;
  akcent?: boolean;
  patina?: boolean;
}

/** Sestavy z rules.ts, ať se pravidla nerozejdou s kódem. */
const SESTAVY_TEXT = Array.from({ length: MAX_HRACU - MIN_HRACU + 1 }, (_, i) => {
  const n = MIN_HRACU + i;
  const s = sestavaPro(n);
  return `${n} hráčů: ${s.saboteri} ${s.saboteri === 1 ? 'sabotér' : s.saboteri < 5 ? 'sabotéři' : 'sabotérů'}, ${s.limitSicht} ${s.limitSicht < 5 ? 'šichty' : 'šicht'}`;
});

const PRAVIDLA: Karta[] = [
  {
    nadpis: 'O CO JDE', akcent: true,
    text: 'Část party jsou tajní sabotéři. Každé kolo jde půlka stolu na šichtu a každý z party tajně zmáčkne MAKAT, nebo KAZIT. Když nikdo nekazil, šichta prošla. Když aspoň jeden kazil, padla a stůl se dozví, kolik lidí kazilo. To je jediný tvrdý důkaz ve hře. Pracanti musí sabotéry vyhostit dřív, než dojdou šichty.',
  },
  {
    nadpis: 'KDO JE KDO',
    kroky: [
      'Pracant: většina stolu. Na šichtě umí jen makat. Nezná nikoho.',
      'Sabotér: tajná menšina. Sabotéři se od začátku znají jmenovitě. Kazit můžou, nemusí.',
      'Předák: jeden ze sabotérů. V noci vybírá odměnu a rozhoduje, kdo umře. Když odejde, přebírá to další sabotér.',
      'Stín: hráč po vyhoštění nebo po vraždě. Zůstává u stolu a mluví dál. Nechodí na šichty, nenominuje, má jeden hlas na zbytek hry.',
      'Počet sabotérů je vždy veřejný.',
    ],
  },
  {
    nadpis: 'KOLO KROK ZA KROKEM', cislovane: true,
    text: 'Časy jsou stropy. Fáze, ve které už odevzdali všichni, skončí sama.',
    kroky: [
      'Zadání, 15 s: aplikace vylosuje partu, zhruba půlku živých. Vidí ji celý stůl a zůstane v přehledu.',
      'Šichta, 45 s: každý z party tajně ťukne MAKAT, nebo KAZIT. Tlačítka vypadají stejně pro obě role.',
      'Výsledek, 22 s: prošla, nebo padla a kolik lidí kazilo.',
      'Šeptanda, 20 s: jen po prošlé šichtě. Každý dostane vlastní pravdivou větu.',
      'Rozprava, 3 až 5 min: telefony lícem dolů, mluví se. Většina živých ji může utnout.',
      'Nominace, 60 s: každý živý tajně nominuje jednoho, nebo nikoho. Před radu jdou dva s nejvíc nominacemi.',
      'Poslední slovo, 30 s na hlavu: každý kandidát se obhájí, ostatní mlčí.',
      'Rada, 45 s: hlasuje se pro kandidáta, nebo se zdržíš. Pak se ukáže, kdo koho volil.',
      'Vyhoštění: odchází jen ten, kdo má nadpoloviční většinu hlasů a aspoň dva. Ukáže se mu role.',
      'Noc, 60 s: jen po padlé šichtě. Předák vybírá odměnu, ostatní tipují podezřelého.',
      'Ráno: kdo umřel, kdo má imunitu, nebo že bude tma. Pak další šichta.',
    ],
  },
  {
    nadpis: 'ŠEPTANDA',
    text: 'Odměna za prošlou šichtu. Každý dostane jednu vlastní větu a ta je vždy pravdivá. Třeba „aspoň jeden z téhle dvojice je pracant" nebo „v kole 2 nominoval právě jeden sabotér". Nikdo si cizí větu neověří. Pracant ji řekne nahlas a hájí. Sabotér dostal větu ze stejného pytle, ale k ničemu mu není, takže lže, nebo mlčí. Za jednu šichtu vzniknou nejvýš tři různé věty, takže víc lidí může dostat tutéž. Dva se stejnou větou se potvrzují.',
  },
  {
    nadpis: 'PADLÁ ŠICHTA A NOC',
    text: 'Předák vybere jednu ze tří odměn. Vražda: jeden hráč dnes v noci končí. Imunita: kdokoliv, i pracant, nemůže jít do nejbližší rady. Tma: u nejbližší rady se neukáže, kdo koho volil. Vraždit nejde dvě kola po sobě. Sabotéři předákovi navrhují oběť, on rozhodne. Všichni ostatní zatím zapisují podezřelého, takže nikdo nepozná, kdo v noci opravdu rozhoduje. Ráno se stůl dozví oběť, imunitu i tmu.',
  },
  {
    nadpis: 'RADA',
    text: 'Nominovat nikoho i zdržet se hlasování jsou plnohodnotné tahy. Když nikdo nikoho nenominuje, rada se přeskočí. Odchází jen ten, kdo má nadpoloviční většinu odevzdaných hlasů a nejméně dva. Při remíze nikdo. Kolo bez vyhoštění je normální výsledek, jen vám ubyla šichta. Hlasy jsou veřejné, kromě tmy.',
  },
  {
    nadpis: 'STÍNY',
    text: 'Kdo odejde, sedí u stolu dál a mluví dál. Má jeden hlas na celý zbytek hry: použitím je nadobro pryč, i když rada skončí bez vyhoštění. Zdržením se neutratí. Stín nenominuje, nemůže být nominován a nechodí na šichty. Vyřazení sabotéři tvrdí, že byli pracanti, úplně stejně jako vyřazení pracanti.',
  },
  {
    nadpis: 'VÝHRA', patina: true,
    text: 'Pracanti vyhrají vyhoštěním posledního sabotéra. Sabotéři vyhrají, když dojdou šichty a aspoň jeden z nich žije, nebo když nezůstane žádný živý pracant. Žádné pravidlo o rovnosti počtů není: i jeden pracant proti dvěma sabotérům může vyhrát, protože stíny mají hlasy.',
  },
  {
    nadpis: 'KOLIK VÁS JE',
    text: 'Parta na šichtu je vždy zhruba půlka živých a nikdy celý stůl. Pětka je tréninková partie, od šesti se hra rozjede.',
    kroky: SESTAVY_TEXT,
  },
  {
    nadpis: 'U STOLU',
    kroky: [
      'Telefon je jen tvůj. Nikomu ho nepůjčuj, nikomu nekoukej přes rameno.',
      'Během rozpravy lícem dolů. Přehled šicht a zápisník jsou zamčené, kdo chce něco vědět, ptá se nahlas.',
      'Sahej na telefon v každé fázi, i když nemáš co dělat. Kdo ho bere jen v noci, prozradí se.',
      'Nekoukej, jak dlouho kdo kouká. A nedávej k tomu důvod.',
      'Stíny mluví. Vyřazený hráč hraje dál slovy.',
      'Nic se neukazuje. Kdo ukáže roli nebo šeptandu, zabil hru.',
    ],
  },
  {
    nadpis: 'KDYŽ SE NĚCO POKAZÍ',
    kroky: [
      'Někomu vypadne spojení: hra se pro všechny zastaví, odpočet stojí. Po návratu se pokračuje od stejné vteřiny. Zakladatel může rozhodnout, že se hraje bez něj.',
      'Zavřená karta nebo obnovená stránka: aplikace tě do tří hodin vrátí zpátky do hry.',
      'Nedá se dohrát: zakladatel šichtu ukončí z pauzy nebo z přehledu, na dvě ťuknutí. Konec je bez vítěze, role se odhalí.',
      'Přehled a zápisník máš na tlačítkách dole. Přehled ukazuje historii šicht a tvou roli, zápisník je jen tvůj.',
    ],
  },
];

export function Pravidla({ onZpet, vHre }: { onZpet: () => void; vHre?: boolean }) {
  const [zvuk, setZvuk] = useState(zvukZapnuty());

  return (
    <Obrazovka>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, borderBottom: '3px solid var(--ram)', paddingBottom: 12 }}>
        <Zpet onClick={onZpet} />
        <h1 style={{ margin: 0, flexGrow: 1, fontFamily: 'var(--font-nadpis)', fontWeight: 400, fontSize: 26, letterSpacing: '0.05em' }}>PRAVIDLA</h1>
        <Stitek tlumeny>{vHre ? 'KDYKOLIV' : '3 MINUTY'}</Stitek>
      </div>

      <Rostouci style={{ gap: 12 }}>
        {!vHre && (
          <Poznamka>
            Přečti si to celé, každý na svém telefonu. Hra je férová jen tehdy,
            když všichni vědí totéž a rozhoduje jen to, jak hrajete a jak mluvíte.
          </Poznamka>
        )}

        {PRAVIDLA.map((p) => (
          <div
            key={p.nadpis}
            style={{
              flexShrink: 0, padding: '13px 15px',
              borderLeft: `4px solid ${p.akcent ? 'var(--rez-400)' : p.patina ? 'var(--patina-400)' : 'var(--ram)'}`,
            }}
          >
            <div style={{ fontFamily: 'var(--font-nadpis)', fontSize: 20, letterSpacing: '0.04em', marginBottom: 6 }}>{p.nadpis}</div>
            {p.text && <div style={{ fontSize: 'var(--t-prose-size)', lineHeight: 1.6, color: 'var(--text)' }}>{p.text}</div>}
            {p.kroky && (
              <ol style={{ margin: p.text ? '8px 0 0' : 0, padding: '0 0 0 18px', listStyle: p.cislovane ? 'decimal' : 'square', display: 'flex', flexDirection: 'column', gap: 5 }}>
                {p.kroky.map((k) => (
                  <li key={k} style={{ fontSize: 'var(--t-prose-size)', lineHeight: 1.55, color: 'var(--text)' }}>{k}</li>
                ))}
              </ol>
            )}
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

      <Tlacitko druh="hlavni" vyska={76} onClick={onZpet}>{vHre ? 'ZPĚT DO HRY' : 'ROZUMÍM'}</Tlacitko>
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
