import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import './ui/tokens.css';

import { Obrazovka, Popisek, PredejDrzitele, Tlacitko, Znacka } from './ui/primitives';
import { KodSichty, Prezdivka, Pripojuji, Satna, Uvod } from './screens/lobby';
import { CekaSe, TvaRole } from './screens/role';
import { Predel, Septanda, Vysledek, Volba as VolbaSichty, Zadani } from './screens/sichta';
import { Hlasy, Kandidati, Nominace, PosledniSlovo, Rada, Rozprava, Vyhosteni } from './screens/rada';
import { Obet, Odmeny, Podezrely, Rano } from './screens/noc';
import { Konec, Odhaleni, Prehled, type KoloPrehled, type Odhaleny } from './screens/konec';
import { Pauza, Pravidla } from './screens/pomocne';
import { NastaveniHry } from './screens/nastaveni';
import { PoskytniZapisnik, Zapisnik } from './ui/zapisnik';

import { delkaFaze } from './game/rules';
import type { HracId, Odmena } from './game/types';
import type { Pohled } from './game/pohled';
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

function useOdpocet(klic: string, delka: number, bezi: boolean, onDoslo: (() => void) | null) {
  const [zbyva, setZbyva] = useState(delka);
  useEffect(() => { setZbyva(delka); }, [klic, delka]);
  useEffect(() => {
    if (!bezi || delka <= 0) return;
    const t = setInterval(() => setZbyva((z) => {
      if (z <= 1) { onDoslo?.(); return 0; }
      return z - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [klic, delka, bezi, onDoslo]);
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
  const { pohled, poslat, naRade, hotseatStav, hotseatDal, hotseatHotovo } = hra;

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

  useEffect(() => {
    setPrevzal(false); setVyber(null); setOdmena(null); setOdkryto(0);
  }, [pohled?.faze, pohled?.kolo, naRade]);

  // Odkaz ze šatny: /sichta/?k=ABC123 přeskočí ťukání kódu rovnou na přezdívku.
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

  // Fáze posouvá server. Lokálně to musí udělat odpočet sám.
  const posun = useMemo(() => (jeOnline ? null : hotseatDal), [jeOnline, hotseatDal]);
  const zivych = pohled?.hraci.filter((h) => h.zivy).length ?? 0;
  const delka = pohled ? delkaFaze(pohled.faze, zivych) : 0;
  const cekaSeNaLidi = !jeOnline && naRade !== null;
  const bezi = krok === 'hra' && !cekaSeNaLidi && !pohled?.pauza;
  const zbyva = useOdpocet(`${pohled?.faze}-${pohled?.kolo}`, delka, bezi, posun);
  const podil = delka > 0 ? 1 - zbyva / delka : 0;

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
        hraci={hotseatStav?.hraci ?? []}
        jsemZakladatel
        popisekAkce="PŘIDAT HRÁČE"
        onPravidla={doPravidel}
        onNastaveni={() => setKrok('prezdivka')}
        onNastaveniHry={() => setKrok('nastaveni')}
        onZacit={() => { poslat({ typ: 'ZACIT' }); setKrok('hra'); }}
      />
    );
  }

  if (!pohled) {
    return <Pripojuji kod={kod ?? ''} stav={hra.sit ?? 'pripojuji'} onZpet={() => { setKod(null); setKrok('uvod'); }} />;
  }

  const p: Pohled = pohled;

  if (p.faze === 'satna') {
    return (
      <Satna
        kod={kod ?? ''}
        odkaz={kod ? `${window.location.origin}${window.location.pathname}?k=${kod}` : null}
        hraci={p.hraci.map((h) => ({ ...h, zakladatel: h.zakladatel }))}
        jsemZakladatel={p.hraci.find((h) => h.id === p.ja.id)?.zakladatel ?? false}
        onPravidla={doPravidel}
        onNastaveni={() => {}}
        onNastaveniHry={() => setKrok('nastaveni')}
        onZacit={() => poslat({ typ: 'ZACIT' })}
      />
    );
  }

  if (p.pauza) {
    const zakladatel = p.hraci.find((h) => h.zakladatel);
    return (
      <Pauza
        kvuli={jm(p.pauza.kvuli)} duvod={p.pauza.duvod} faze={p.faze}
        zbyvaloSekund={zbyva} cekaSe={0}
        jsemZakladatel={!jeOnline || zakladatel?.id === p.ja.id}
        onCekat={() => poslat({ typ: 'PRIPOJIL_SE', id: p.pauza!.kvuli })}
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
  const mojeJmeno = jeOnline ? jm(ja) : null;
  const jaHrac = p.hraci.find((h) => h.id === ja);
  const zivi = p.hraci.filter((h) => h.zivy);
  const smena = p.stul.smena ?? 'odpoledni';

  const obrazovka = ((): ReactElement | null => {
    switch (p.faze) {
      case 'rozdani':
        return (
          <TvaRole
            role={p.ja.role} spoluSaboteri={p.ja.spoluSaboteri} jsemPredak={p.ja.jsemPredak}
            pocetHracu={p.hraci.length} pocetSaboteru={p.pocetSaboteru}
            pripraven={false}
            onPripraven={jeOnline ? () => poslat({ typ: 'PRIPRAVEN', id: ja }) : hotovo}
          />
        );

      case 'predel':
        return <Predel kolo={p.kolo} smena={smena} zbyvaSicht={zbyvaSicht} onDal={dal} />;

      case 'zadani':
        return (
          <Zadani
            kolo={p.kolo} smena={smena}
            parta={p.stul.parta.map(jm)}
            zustavaji={zivi.filter((h) => !p.stul.parta.includes(h.id)).map((h) => h.jmeno)}
            jsemVParte={jeOnline && p.stul.parta.includes(ja)}
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
            kolo={p.kolo} smena={smena} parta={p.stul.parta.map(jm)} mojeJmeno={jm(ja)}
            sekundy={cas}
            odevzdano={p.ja.volbaSichty}
            onVolba={(v) => poslat({ typ: 'VOLBA_SICHTY', id: ja, volba: v })}
            onHotovo={hotovo}
          />
        );

      case 'vysledek':
        return (
          <Vysledek
            kolo={p.kolo} smena={smena} padla={p.stul.padla ?? false} sabotazi={p.stul.sabotazi ?? 0}
            parta={p.stul.parta.map(jm)} mojeJmeno={mojeJmeno}
            podil={podil} onPreskocit={preskocit}
          />
        );

      case 'septanda':
        return <Septanda text={p.ja.septanda ?? ''} onHotovo={jeOnline ? () => {} : hotovo} />;

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

      case 'kandidati':
        return (
          <Kandidati
            kandidati={p.stul.kandidati.map((id) => ({ jmeno: jm(id), hlasu: 0 }))}
            nepostupuji={[]}
            podil={podil} onPreskocit={preskocit}
          />
        );

      case 'posledni_slovo':
        return (
          <PosledniSlovo
            mluvi={jm(p.stul.kandidati[0])}
            potom={p.stul.kandidati[1] ? jm(p.stul.kandidati[1]) : null}
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
        const hlasy = p.stul.hlasy.map((h) => ({ kdo: jm(h.kdo), komu: jm(h.komu), stin: h.stin }));
        const pocty = new Map<string, number>();
        for (const h of hlasy.slice(0, odkryto)) pocty.set(h.komu, (pocty.get(h.komu) ?? 0) + 1);
        const max = Math.max(0, ...pocty.values());
        return (
          <Hlasy
            kandidati={p.stul.kandidati.map((id) => ({
              jmeno: jm(id), hlasu: pocty.get(jm(id)) ?? 0,
              vede: (pocty.get(jm(id)) ?? 0) === max && max > 0,
            }))}
            hlasy={hlasy} odkryto={odkryto} tma={p.stul.tmaNadHlasovanim}
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
        if (p.ja.jsemPredak && !p.stul.odmena && p.ja.odmeny.length > 0) {
          return (
            <Odmeny
              dostupne={p.ja.odmeny} vybrana={odmena} onVybrat={setOdmena}
              onPotvrdit={() => {
                if (!odmena) return;
                poslat({ typ: 'VYBRAT_ODMENU', odmena });
                if (odmena !== 'vrazda') hotovo();
              }}
            />
          );
        }

        if (p.ja.role === 'saboter' && p.stul.odmena === 'vrazda') {
          const spolu = new Set(p.ja.spoluSaboteri.map((s) => s.id));
          return (
            <Obet
              cile={zivi.map((h) => ({ id: h.id, jmeno: h.jmeno, zivy: true, spolusaboter: spolu.has(h.id) || h.id === ja }))}
              vybrany={vyber} sekundy={cas} jsemPredak={p.ja.jsemPredak} odmena="vrazda"
              onVybrat={setVyber}
              onPotvrdit={() => {
                if (!vyber) return;
                poslat(p.ja.jsemPredak ? { typ: 'PREDAK_ROZHODL', cil: vyber } : { typ: 'NAVRHNOUT_OBET', id: ja, cil: vyber });
                hotovo();
              }}
            />
          );
        }

        return (
          <Podezrely
            cile={zivi.filter((h) => h.id !== ja).map((h) => ({ id: h.id, jmeno: h.jmeno, zivy: true }))}
            vybrany={vyber} sekundy={cas} onVybrat={setVyber}
            onPotvrdit={() => { if (vyber) poslat({ typ: 'ZAPSAT_PODEZRELEHO', id: ja, cil: vyber }); hotovo(); }}
          />
        );
      }

      case 'rano':
        return (
          <Rano
            kolo={Math.max(1, p.kolo - 1)}
            obet={p.stul.obet ? jm(p.stul.obet) : null}
            zivych={zivi.length} stinu={p.hraci.length - zivi.length}
            zbyvaSicht={zbyvaSicht} podil={podil} onPreskocit={preskocit}
          />
        );

      case 'konec': {
        const kn = p.konec;
        if (!kn) return null;

        if (krok === 'prubeh') {
          const kola: KoloPrehled[] = kn.kola.map((x) => ({
            cislo: x.cislo, padla: x.padla, sabotazi: x.sabotazi,
            parta: x.parta.map((id) => ({ jmeno: jm(id), saboter: kn.role[id] === 'saboter' })),
            rada: x.vyhosteny ? jm(x.vyhosteny) : null,
            noc: x.obet ? jm(x.obet) : null,
          }));
          return <Prehled kola={kola} poznamka={null} onZpet={() => setKrok('odhaleni')} />;
        }

        if (krok === 'odhaleni') {
          const odhaleni: Odhaleny[] = p.hraci.map((h) => {
            const rk = kn.kola.find((x) => x.vyhosteny === h.id);
            const nk = kn.kola.find((x) => x.obet === h.id);
            return {
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
              onPrubeh={() => setKrok('prubeh')}
              onZnovu={() => window.location.reload()}
            />
          );
        }

        return (
          <Konec
            vitez={p.vitez ?? 'saboteri'} duvod={p.duvodKonce ?? ''}
            sicht={kn.kola.length} padlo={kn.kola.filter((x) => x.padla).length}
            stinu={p.hraci.length - zivi.length}
            onOdhalit={() => setKrok('odhaleni')}
          />
        );
      }

      default:
        return <CekaSe hraci={p.hraci} hotovi={p.stul.odevzdali} podil={podil} popis="Moment." />;
    }
  })();

  // Zápisník se nabízí od zadání šichty dál. Dřív není co si psát a na
  // obrazovce s rolí by jen odváděl pozornost.
  const zapisnikAktivni = !['rozdani', 'predel', 'satna'].includes(p.faze);

  return (
    <PredejDrzitele jmeno={jeOnline ? null : naRade ? jm(naRade) : null}>
      <PoskytniZapisnik kod={kod} hracId={ja} jmeno={jm(ja)} aktivni={zapisnikAktivni}>
        {obrazovka}
        <Zapisnik />
      </PoskytniZapisnik>
    </PredejDrzitele>
  );
}
