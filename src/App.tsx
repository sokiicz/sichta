import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import './ui/tokens.css';

import { Obrazovka, Pomucky, Popisek, PredejDrzitele, Tlacitko, Znacka } from './ui/primitives';
import { KodSichty, Nepustili, Prezdivka, Pripojuji, Satna, Uvod } from './screens/lobby';
import { CekaSe, TvaRole } from './screens/role';
import { Predel, Septanda, Vysledek, Volba as VolbaSichty, Zadani } from './screens/sichta';
import { Hlasy, Kandidati, Nominace, PosledniSlovo, Rada, Rozprava, Vyhosteni } from './screens/rada';
import { CekaNoc, Obet, Odmeny, POPIS_ODMENY, Podezrely, Rano } from './screens/noc';
import { Konec, Odhaleni, Prehled, type KoloPrehled, type Odhaleny } from './screens/konec';
import { Pauza, Pravidla } from './screens/pomocne';
import { NastaveniHry } from './screens/nastaveni';
import { PoskytniZapisnik, Zapisnik } from './ui/zapisnik';
import { PoskytniPrehled, Prehled as PrehledHry, type DataPrehledu } from './ui/prehled';
import { useBdeni } from './ui/bdeni';

import { delkaFaze } from './game/rules';
import type { HracId, Odmena } from './game/types';
import type { KoloVerejne, Pohled } from './game/pohled';
import { useHra, type Rezim } from './net/useHra';
import { useOzvuceni } from './ui/zvuk';
import { zakladnaUrl, zalozitMistnost } from './net/klient';
import { platnyKod } from './game/kod';

// ---------------------------------------------------------------- předání

/** Hot seat: telefon koluje. Drží, dokud ho nedostane ten pravý. */
function Predej({ komu, onPrevzal }: { komu: string; onPrevzal: () => void }) {
  return (
    <Obrazovka tmava>
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 26, textAlign: 'center' }}>
        <Znacka velikost={56} />
        <Popisek>PODEJ TELEFON</Popisek>
        <div style={{ fontFamily: 'var(--font-nadpis)', fontSize: 58, lineHeight: 0.94, letterSpacing: '0.02em', color: 'var(--text-akcent)' }}>
          {komu.toUpperCase()}
        </div>
        <div style={{ fontSize: 'var(--t-prose-size)', lineHeight: 1.6, color: 'var(--text-tlum)', maxWidth: 260 }}>
          Ostatní se teď nedívají. Až budeš mít telefon v ruce, ťukni.
        </div>
      </div>
      <Tlacitko druh="hlavni" vyska={82} onClick={onPrevzal}>MÁM HO</Tlacitko>
    </Obrazovka>
  );
}

// ---------------------------------------------------------------- odpočet

/**
 * Online odpočet. Nepočítá se z hodin telefonu, ale z času serveru: server
 * poslal, kdy fáze končí, a s každou zprávou i svůj čas, takže se posun
 * hodin jen přičte. Po návratu z výpadku sedí na vteřinu.
 */
function useOdpocetServeru(konecFaze: number | null, posun: number): number | null {
  const [ted, setTed] = useState(() => Date.now());
  useEffect(() => {
    if (konecFaze == null) return;
    setTed(Date.now());
    const t = setInterval(() => setTed(Date.now()), 500);
    return () => clearInterval(t);
  }, [konecFaze]);
  if (konecFaze == null) return null;
  return Math.max(0, Math.ceil((konecFaze - (ted + posun)) / 1000));
}

/**
 * Odpočet na jednom telefonu. Posun fáze se volá z efektu, ne z updateru
 * stavu: React updatery ve StrictMode pouští dvakrát a jednou už to
 * přeskočilo celou fázi.
 */
function useOdpocetLokalni(klic: string, delka: number, bezi: boolean, onDoslo: () => void): number {
  const [zbyva, setZbyva] = useState(delka);
  const start = useRef(Date.now());
  useEffect(() => { start.current = Date.now(); setZbyva(delka); }, [klic, delka, bezi]);
  useEffect(() => {
    if (!bezi || delka <= 0) return;
    const t = setInterval(() => setZbyva(Math.max(0, delka - Math.floor((Date.now() - start.current) / 1000))), 500);
    return () => clearInterval(t);
  }, [klic, delka, bezi]);
  useEffect(() => {
    if (bezi && delka > 0 && zbyva === 0) onDoslo();
  }, [zbyva, bezi, delka, onDoslo]);
  return zbyva;
}

// ---------------------------------------------------------------- aplikace

type Krok = 'uvod' | 'prezdivka' | 'kod' | 'satna' | 'hra' | 'pravidla' | 'nastaveni' | 'odhaleni' | 'prubeh';

export default function App() {
  const [rezim, setRezim] = useState<Rezim>('hotseat');
  const [kod, setKod] = useState<string | null>(null);
  const [jmeno, setJmeno] = useState('');
  const [krok, setKrok] = useState<Krok>('uvod');
  const [predchozi, setPredchozi] = useState<Krok>('uvod');
  const [chyba, setChyba] = useState<string | null>(null);
  const [zalozit, setZalozit] = useState(false);

  const hra = useHra(rezim, kod, jmeno);
  const { pohled, poslat, naRade, hotseatStav, hotseatDal, hotseatHotovo, posunHodin } = hra;

  const [prevzal, setPrevzal] = useState(false);
  const [vyber, setVyber] = useState<string | null>(null);
  const [odmena, setOdmena] = useState<Odmena | null>(null);
  const [odkryto, setOdkryto] = useState(0);

  const jeOnline = rezim === 'online';
  const siteDostupna = zakladnaUrl().length > 0;

  // Nahlas hraje jeden telefon. Po síti ten zakladatelův, jinak by osm
  // telefonů houkalo přes sebe.
  const hlasite = !jeOnline || (pohled?.hraci.find((h) => h.id === pohled.ja.id)?.zakladatel ?? false);
  useOzvuceni(pohled, hlasite);

  // Displej nesmí zhasnout uprostřed rozpravy, jinak spadne spojení.
  useBdeni(jeOnline && krok === 'hra' && pohled !== null && pohled.faze !== 'konec');

  useEffect(() => {
    setPrevzal(false); setVyber(null); setOdmena(null); setOdkryto(0);
  }, [pohled?.faze, pohled?.kolo, pohled?.stul.mluvi, naRade]);

  // Po "ještě jednou" se hra vrátí do šatny a obrazovky konce musí pryč.
  useEffect(() => {
    if (pohled?.faze === 'satna' && (krok === 'odhaleni' || krok === 'prubeh')) setKrok('hra');
  }, [pohled?.faze, krok]);

  // Odkaz ze šatny: /?k=ABC123 přeskočí ťukání kódu rovnou na přezdívku.
  // Kód se z adresy hned uklidí, aby ho obnovení stránky nevrátilo do hry, ze
  // které už člověk odešel.
  useEffect(() => {
    const z = new URLSearchParams(window.location.search).get('k');
    if (!z || !platnyKod(z)) return;
    window.history.replaceState(null, '', window.location.pathname);
    if (!zakladnaUrl()) return;
    setRezim('online');
    setZalozit(false);
    setKod(z.toUpperCase());
    setKrok('prezdivka');
  }, []);

  const zivych = pohled?.hraci.filter((h) => h.zivy).length ?? 0;
  const delka = pohled ? delkaFaze(pohled.faze, zivych, pohled.stul.kandidati.length) : 0;
  const cekaSeNaLidi = !jeOnline && naRade !== null;
  const bezi = krok === 'hra' && !cekaSeNaLidi && !pohled?.pauza;
  const zbyvaServer = useOdpocetServeru(jeOnline ? pohled?.konecFaze ?? null : null, posunHodin);
  const zbyvaLokalne = useOdpocetLokalni(
    `${pohled?.faze}-${pohled?.kolo}-${pohled?.stul.mluvi}`, jeOnline ? 0 : delka, !jeOnline && bezi, hotseatDal,
  );
  const zbyva: number | null = jeOnline ? zbyvaServer : zbyvaLokalne;
  const podil = delka > 0 && zbyva != null ? 1 - zbyva / delka : 0;

  useEffect(() => {
    if (pohled?.faze !== 'hlasy') return;
    const t = setInterval(() => setOdkryto((o) => o + 1), 260);
    return () => clearInterval(t);
  }, [pohled?.faze]);

  const jm = useCallback((id: HracId | null | undefined): string =>
    pohled?.hraci.find((h) => h.id === id)?.jmeno ?? '?', [pohled]);

  const doPravidel = () => { setPredchozi(krok); setKrok('pravidla'); };

  if (krok === 'pravidla') return <Pravidla onZpet={() => setKrok(predchozi)} />;

  if (krok === 'nastaveni') {
    const nast = jeOnline ? pohled?.nastaveni : hotseatStav?.nastaveni;
    if (nast) {
      return (
        <NastaveniHry
          nastaveni={nast}
          onPrepnout={(klic, hodnota) => poslat({ typ: 'ZMENIT_NASTAVENI', nastaveni: { [klic]: hodnota } })}
          onZpet={() => setKrok(jeOnline ? 'hra' : 'satna')}
        />
      );
    }
  }

  if (krok === 'uvod') {
    return (
      <Uvod
        siteDostupna={siteDostupna}
        chyba={chyba}
        onZalozit={() => { setChyba(null); setRezim('online'); setZalozit(true); setKrok('prezdivka'); }}
        onPripojit={() => { setRezim('online'); setZalozit(false); setKrok('kod'); }}
        onHotSeat={() => { setRezim('hotseat'); setKrok('prezdivka'); }}
        onPravidla={doPravidel}
      />
    );
  }

  if (krok === 'kod') {
    return (
      <KodSichty
        chyba={chyba}
        onZpet={() => { setChyba(null); setKrok('uvod'); }}
        onHotovo={(k) => { setKod(k); setChyba(null); setKrok('prezdivka'); }}
      />
    );
  }

  if (krok === 'prezdivka') {
    return (
      <Prezdivka
        vychozi={jmeno}
        onZpet={() => setKrok(jeOnline && !zalozit ? 'kod' : 'uvod')}
        onPravidla={doPravidel}
        onHotovo={async (j) => {
          setJmeno(j);
          if (!jeOnline) {
            poslat({ typ: 'PRIDAT_HRACE', id: `h${hotseatStav?.hraci.length ?? 0}`, jmeno: j });
            setKrok('satna');
            return;
          }
          if (zalozit) {
            try {
              setKod(await zalozitMistnost());
            } catch {
              setChyba('Server šichty neodpovídá. Zkus to za chvíli, nebo hrajte na jednom telefonu.');
              setKrok('uvod');
              return;
            }
          }
          setKrok('hra');
        }}
      />
    );
  }

  if (krok === 'satna') {
    return (
      <Satna
        kod="JEDEN TELEFON"
        hraci={(hotseatStav?.hraci ?? []).map((h) => ({ id: h.id, jmeno: h.jmeno, zakladatel: h.zakladatel, pripojeny: true }))}
        jaId={null}
        jsemZakladatel
        popisekAkce="PŘIDAT HRÁČE"
        onPravidla={doPravidel}
        onNastaveni={() => setKrok('prezdivka')}
        onNastaveniHry={() => setKrok('nastaveni')}
        onVyhodit={(id) => poslat({ typ: 'ODEBRAT_HRACE', id })}
        onZacit={() => { poslat({ typ: 'ZACIT' }); setKrok('hra'); }}
      />
    );
  }

  if (hra.chyba) {
    return <Nepustili kod={kod ?? ''} duvod={hra.chyba} onZpet={() => { setKod(null); setKrok('uvod'); }} />;
  }

  if (!pohled) {
    return <Pripojuji kod={kod ?? ''} stav={hra.sit ?? 'pripojuji'} onZpet={() => { setKod(null); setKrok('uvod'); }} />;
  }

  const p: Pohled = pohled;
  const jaOnline = p.hraci.find((h) => h.id === p.ja.id);
  const jsemZakladatel = !jeOnline || (jaOnline?.zakladatel ?? false);

  if (p.faze === 'satna') {
    return (
      <Satna
        kod={kod ?? ''}
        odkaz={kod ? `${window.location.origin}${window.location.pathname}?k=${kod}` : null}
        hraci={p.hraci}
        jaId={p.ja.id}
        jsemZakladatel={jsemZakladatel}
        onPravidla={doPravidel}
        onNastaveniHry={() => setKrok('nastaveni')}
        onVyhodit={(id) => poslat({ typ: 'ODEBRAT_HRACE', id })}
        onZacit={() => poslat({ typ: 'ZACIT' })}
      />
    );
  }

  if (p.pauza) {
    return (
      <Pauza
        kvuli={jm(p.pauza.kvuli)} duvod={p.pauza.duvod} faze={p.faze}
        zbyvaMs={p.pauza.zbyva} odMs={p.pauza.od} posunHodin={posunHodin}
        jsemZakladatel={jsemZakladatel}
        onHratBezNej={() => poslat({ typ: 'HRAT_BEZ_NEJ', id: p.pauza!.kvuli })}
      />
    );
  }

  if (naRade && !prevzal) return <Predej komu={jm(naRade)} onPrevzal={() => setPrevzal(true)} />;

  /** Kdo právě jedná. Online vždy já, v hot seatu ten, kdo drží telefon. */
  const ja: HracId = naRade ?? p.ja.id;
  const hotovo = jeOnline ? () => {} : hotseatHotovo;
  const dal = jeOnline ? () => {} : hotseatDal;
  const preskocit = jeOnline ? undefined : hotseatDal;
  const zbyvaSicht = Math.max(0, p.limitSicht - p.kolo);
  // Na jednom telefonu fázi nehlídají hodiny, protože se zařízení podává.
  // Zamrzlý odpočet vypadá jako rozbitá appka, tak se radši nekreslí vůbec.
  const cas: number | null = jeOnline ? zbyva : null;
  // Obrazovky stolu nesmí nikoho vypíchnout jako "ty". Na jednom telefonu je
  // totiž "ty" jen náhodný první hráč, kterému patří pohled.
  const jaProStul: HracId | null = jeOnline ? ja : null;
  const jaHrac = p.hraci.find((h) => h.id === ja);
  const zivi = p.hraci.filter((h) => h.zivy);
  const clen = (id: HracId) => ({ id, jmeno: jm(id) });
  const smena = p.stul.smena ?? 'odpoledni';
  /** Na jednom telefonu je soukromé jen to, co drží konkrétní hráč v ruce. */
  const soukrome = jeOnline || naRade !== null;

  const koloPrehled = (k: KoloVerejne, role?: Record<HracId, 'pracant' | 'saboter'>): KoloPrehled => ({
    cislo: k.cislo,
    smeny: k.smeny.map((sm) => ({
      smena: sm.smena, padla: sm.padla, sabotazi: sm.sabotazi,
      parta: sm.parta.map((id) => ({ id, jmeno: jm(id), saboter: role ? role[id] === 'saboter' : undefined })),
    })),
    vyhosteny: k.vyhosteny ? { jmeno: jm(k.vyhosteny), role: k.roleVyhosteneho } : null,
    obet: k.obet ? jm(k.obet) : null,
    imunni: k.imunni ? jm(k.imunni) : null,
    tma: k.tma,
    hlasy: k.hlasy ? k.hlasy.map((h) => ({ kdo: jm(h.kdo), komu: jm(h.komu), stin: h.stin })) : null,
  });

  const obrazovka = ((): ReactElement | null => {
    switch (p.faze) {
      case 'rozdani':
        return (
          <TvaRole
            role={p.ja.role} spoluSaboteri={p.ja.spoluSaboteri} jsemPredak={p.ja.jsemPredak}
            pocetHracu={p.hraci.length} pocetSaboteru={p.pocetSaboteru}
            pripraven={jeOnline && p.ja.odevzdal} pripravenych={p.stul.odevzdali.length}
            onPripraven={jeOnline ? () => poslat({ typ: 'PRIPRAVEN', id: ja }) : hotovo}
          />
        );

      case 'predel':
        return <Predel kolo={p.kolo} smena={smena} limit={p.limitSicht} onDal={dal} />;

      case 'zadani':
        return (
          <Zadani
            kolo={p.kolo} smena={smena}
            parta={p.stul.parta.map(clen)}
            zustavaji={zivi.filter((h) => !p.stul.parta.includes(h.id)).map((h) => clen(h.id))}
            jaId={jaProStul}
            podil={podil} onPreskocit={preskocit}
          />
        );

      case 'sichta':
        if (!p.stul.parta.includes(ja)) {
          return (
            <CekaSe
              hraci={p.hraci.filter((h) => p.stul.parta.includes(h.id))}
              hotovi={p.stul.odevzdali} podil={podil} onPreskocit={preskocit}
              popis="Parta je na šichtě. Koukejte se po sobě, ne do telefonu."
            />
          );
        }
        return (
          <VolbaSichty
            kolo={p.kolo} smena={smena} parta={p.stul.parta.map(clen)} jaId={ja}
            sekundy={cas}
            odevzdano={p.ja.volbaSichty}
            onVolba={(v) => poslat({ typ: 'VOLBA_SICHTY', id: ja, volba: v })}
            onHotovo={jeOnline ? undefined : hotovo}
          />
        );

      case 'vysledek':
        return (
          <Vysledek
            kolo={p.kolo} smena={smena} padla={p.stul.padla ?? false} sabotazi={p.stul.sabotazi ?? 0}
            parta={p.stul.parta.map(clen)} jaId={jaProStul}
            podil={podil} onPreskocit={preskocit}
          />
        );

      case 'septanda':
        return <Septanda text={p.ja.septanda ?? ''} sekundy={cas} onHotovo={jeOnline ? undefined : hotovo} />;

      case 'rozprava':
        return (
          <Rozprava
            sekundy={zbyva} celkem={delka}
            hlasovani={jeOnline ? {
              kolik: p.stul.chtejiDal.length,
              potreba: p.stul.potrebaProSkok,
              jaChci: p.stul.chtejiDal.includes(ja),
            } : null}
            onDal={dal}
            onChciDal={() => poslat({ typ: 'CHCI_DAL', id: ja })}
          />
        );

      case 'nominace':
        return (
          <Nominace
            kdo={p.hraci.map((h) => ({ id: h.id, jmeno: h.jmeno, zivy: h.zivy }))}
            jaId={ja} vybrany={vyber ?? p.ja.nominoval} sekundy={cas}
            nenominuju={p.ja.nenominuju && !vyber}
            imunni={p.stul.imunni}
            onVybrat={setVyber}
            onNikoho={() => { setVyber(null); poslat({ typ: 'NENOMINUJU', id: ja }); }}
            onPotvrdit={() => {
              const c = vyber ?? p.ja.nominoval;
              if (c) poslat({ typ: 'NOMINOVAT', id: ja, cil: c });
              else poslat({ typ: 'NENOMINUJU', id: ja });
              hotovo();
            }}
          />
        );

      case 'kandidati': {
        const nominaci = p.stul.nominaci ?? {};
        const nepostupuji = Object.entries(nominaci)
          .filter(([id]) => !p.stul.kandidati.includes(id))
          .sort((a, b) => b[1] - a[1])
          .map(([id, n]) => ({ id, jmeno: jm(id), hlasu: n }));
        return (
          <Kandidati
            kandidati={p.stul.kandidati.map((id) => ({ id, jmeno: jm(id), hlasu: nominaci[id] ?? 0 }))}
            nepostupuji={nepostupuji}
            imunni={p.stul.imunni}
            podil={podil} onPreskocit={preskocit}
          />
        );
      }

      case 'posledni_slovo':
        return (
          <PosledniSlovo
            mluvi={jm(p.stul.kandidati[p.stul.mluvi])}
            poradi={p.stul.mluvi + 1} celkem={p.stul.kandidati.length}
            dalsi={p.stul.kandidati[p.stul.mluvi + 1] ? jm(p.stul.kandidati[p.stul.mluvi + 1]) : null}
            sekundy={zbyva} podil={podil} onPreskocit={preskocit}
          />
        );

      case 'rada':
        return (
          <Rada
            kandidati={p.stul.kandidati.map((id) => ({ id, jmeno: jm(id), zivy: true }))}
            vybrany={vyber ?? p.ja.hlasoval} sekundy={cas}
            jsemStin={!(jaHrac?.zivy ?? true)} hlasUtracen={jaHrac?.hlasStinuUtracen ?? false}
            zdrzelSe={p.ja.zdrzelSeHlasovani && !vyber}
            onVybrat={setVyber}
            onZdrzet={() => { setVyber(null); poslat({ typ: 'ZDRZUJU_SE', id: ja }); }}
            onPotvrdit={() => {
              const c = vyber ?? p.ja.hlasoval;
              if (c) poslat({ typ: 'HLASOVAT', id: ja, cil: c });
              else poslat({ typ: 'ZDRZUJU_SE', id: ja });
              hotovo();
            }}
          />
        );

      case 'hlasy': {
        const pocty = new Map<HracId, number>();
        for (const h of p.stul.hlasy.slice(0, odkryto)) pocty.set(h.komu, (pocty.get(h.komu) ?? 0) + 1);
        const max = Math.max(0, ...pocty.values());
        return (
          <Hlasy
            kandidati={p.stul.kandidati.map((id) => ({
              id, jmeno: jm(id), hlasu: pocty.get(id) ?? 0,
              vede: (pocty.get(id) ?? 0) === max && max > 0,
            }))}
            hlasy={p.stul.hlasy.map((h) => ({ kdo: jm(h.kdo), komu: jm(h.komu), stin: h.stin }))}
            odkryto={odkryto} tma={p.stul.tma}
            podil={podil} onPreskocit={preskocit}
          />
        );
      }

      case 'vyhosteni':
        return (
          <Vyhosteni
            kolo={p.kolo}
            kdo={p.stul.vyhosteny ? jm(p.stul.vyhosteny) : null}
            role={p.stul.roleVyhosteneho}
            zbyvaSaboteru={p.stul.zbyvaSaboteru}
            zivych={zivi.length}
            podil={podil} onPreskocit={preskocit}
          />
        );

      case 'noc': {
        const jsemSaboter = p.ja.role === 'saboter' && (jaHrac?.zivy ?? false);
        const cekani = (poznamka: string | null) => (
          <CekaNoc
            hraci={zivi.map((h) => ({ id: h.id, jmeno: h.jmeno, zivy: true }))}
            hotovi={p.stul.odevzdali} sekundy={cas} podil={podil} poznamka={poznamka}
            onPreskocit={preskocit}
          />
        );

        if (p.ja.jsemPredak) {
          if (!p.stul.odmena) {
            return (
              <Odmeny
                dostupne={p.ja.odmeny} vybrana={odmena} cil={vyber}
                hraci={zivi.map((h) => ({ id: h.id, jmeno: h.jmeno, zivy: true }))}
                onVybrat={(o) => { setOdmena(o); setVyber(null); }}
                onCil={setVyber}
                onPotvrdit={() => {
                  if (!odmena) return;
                  if (odmena === 'imunita') {
                    if (!vyber) return;
                    poslat({ typ: 'VYBRAT_ODMENU', odmena, cil: vyber });
                  } else {
                    poslat({ typ: 'VYBRAT_ODMENU', odmena });
                  }
                  setVyber(null);
                  if (odmena !== 'vrazda') hotovo();
                }}
              />
            );
          }
          if (p.stul.odmena === 'vrazda' && !p.ja.rozhodl) {
            const spolu = new Set(p.ja.spoluSaboteri.map((s) => s.id));
            return (
              <Obet
                cile={zivi.map((h) => ({ id: h.id, jmeno: h.jmeno, zivy: true, spolusaboter: spolu.has(h.id) || h.id === ja }))}
                vybrany={vyber} sekundy={cas} jsemPredak odmena={p.stul.odmena}
                navrhy={p.ja.navrhy.map((n) => ({ kdo: jm(n.kdo), komu: jm(n.komu) }))}
                onVybrat={setVyber}
                onPotvrdit={() => {
                  if (!vyber) return;
                  poslat({ typ: 'PREDAK_ROZHODL', cil: vyber });
                  hotovo();
                }}
              />
            );
          }
          return cekani(`Vzal sis ${POPIS_ODMENY[p.stul.odmena].nadpis}${p.ja.rozhodl ? `. Dnes v noci končí ${jm(p.ja.rozhodl)}` : ''}.`);
        }

        if (jsemSaboter) {
          if (!p.ja.navrhl) {
            const spolu = new Set(p.ja.spoluSaboteri.map((s) => s.id));
            return (
              <Obet
                cile={zivi.map((h) => ({ id: h.id, jmeno: h.jmeno, zivy: true, spolusaboter: spolu.has(h.id) || h.id === ja }))}
                vybrany={vyber} sekundy={cas} jsemPredak={false} odmena={p.stul.odmena}
                navrhy={p.ja.navrhy.map((n) => ({ kdo: jm(n.kdo), komu: jm(n.komu) }))}
                onVybrat={setVyber}
                onPotvrdit={() => {
                  if (!vyber) return;
                  poslat({ typ: 'NAVRHNOUT_OBET', id: ja, cil: vyber });
                  hotovo();
                }}
              />
            );
          }
          return cekani(p.stul.odmena
            ? `Předák vzal ${POPIS_ODMENY[p.stul.odmena].nadpis}. Tvůj návrh: ${jm(p.ja.navrhl)}.`
            : `Tvůj návrh: ${jm(p.ja.navrhl)}. Předák ještě vybírá.`);
        }

        if (!p.ja.podezrely) {
          return (
            <Podezrely
              cile={zivi.filter((h) => h.id !== ja).map((h) => ({ id: h.id, jmeno: h.jmeno, zivy: true }))}
              vybrany={vyber} sekundy={cas} onVybrat={setVyber}
              onPotvrdit={() => { if (vyber) poslat({ typ: 'ZAPSAT_PODEZRELEHO', id: ja, cil: vyber }); hotovo(); }}
            />
          );
        }
        return cekani(null);
      }

      case 'rano':
        return (
          <Rano
            kolo={p.kolo}
            obet={p.stul.obet ? jm(p.stul.obet) : null}
            imunni={p.stul.imunni ? jm(p.stul.imunni) : null}
            tma={p.stul.tma}
            zivych={zivi.length} stinu={p.hraci.length - zivi.length}
            zbyvaSicht={zbyvaSicht} podil={podil} onPreskocit={preskocit}
          />
        );

      case 'konec': {
        const kn = p.konec;
        if (!kn) return null;

        if (krok === 'prubeh') {
          return <Prehled kola={p.stul.historie.map((k) => koloPrehled(k, kn.role))} onZpet={() => setKrok('odhaleni')} />;
        }

        if (krok === 'odhaleni') {
          const odhaleni: Odhaleny[] = p.hraci.map((h) => {
            const rk = p.stul.historie.find((x) => x.vyhosteny === h.id);
            const nk = p.stul.historie.find((x) => x.obet === h.id);
            return {
              id: h.id,
              jmeno: h.jmeno,
              role: kn.role[h.id] ?? 'pracant',
              predak: kn.predak === h.id,
              odchod: rk ? `rada ${rk.cislo}` : nk ? `noc ${nk.cislo}` : null,
            };
          }).sort((a, b) => (a.role === b.role ? 0 : a.role === 'saboter' ? -1 : 1));

          return (
            <Odhaleni
              hraci={odhaleni}
              cuch={kn.cuch ? { jmeno: jm(kn.cuch.id), popis: `${kn.cuch.trefil} ze ${kn.cuch.z} správně.` } : null}
              jsemZakladatel={jsemZakladatel}
              onPrubeh={() => setKrok('prubeh')}
              onZnovu={() => { if (jeOnline) poslat({ typ: 'ZNOVU' }); else window.location.reload(); }}
            />
          );
        }

        return (
          <Konec
            vitez={p.vitez ?? 'saboteri'} duvod={p.duvodKonce ?? ''}
            sicht={p.stul.historie.length}
            padlo={p.stul.historie.filter((x) => x.smeny.some((sm) => sm.padla)).length}
            stinu={p.hraci.length - zivi.length}
            onOdhalit={() => setKrok('odhaleni')}
          />
        );
      }

      default:
        return <CekaSe hraci={p.hraci} hotovi={p.stul.odevzdali} podil={podil} popis="Moment." />;
    }
  })();

  // Zápisník a přehled se nabízí od zadání šichty dál a jen tomu, kdo drží
  // telefon. Na obrazovkách stolu by do nich viděl každý.
  const pomucky = soukrome && !['rozdani', 'predel', 'satna', 'konec'].includes(p.faze);
  const dataPrehledu: DataPrehledu | null = pomucky
    ? {
        kola: p.stul.historie.map((k) => koloPrehled(k)),
        role: p.ja.role,
        spoluSaboteri: p.ja.spoluSaboteri,
        jsemPredak: p.ja.jsemPredak,
        pocetSaboteru: p.pocetSaboteru,
      }
    : null;

  return (
    <PredejDrzitele jmeno={jeOnline ? null : naRade ? jm(naRade) : null}>
      <Pomucky.Provider value={pomucky}>
        <PoskytniZapisnik kod={kod} partie={p.partie} hracId={ja} jmeno={jm(ja)} aktivni={pomucky}>
          <PoskytniPrehled data={dataPrehledu} zamceno={p.faze === 'rozprava'}>
            {obrazovka}
            <PrehledHry />
            <Zapisnik />
          </PoskytniPrehled>
        </PoskytniZapisnik>
      </Pomucky.Provider>
    </PredejDrzitele>
  );
}
