import {
  Blok, Hlavicka, Obrazovka, Odpocet, Poznamka, Popisek, Razitko,
  Rostouci, Stitek, Tlacitko, Ukazatel, Veta, Volba,
} from '../ui/primitives';

export interface Kdo { id: string; jmeno: string; zivy: boolean }

// ---------------------------------------------------------------- rozprava

/** Schválně nudná obrazovka. Cokoliv zajímavého by lákalo koukat do telefonu. */
/**
 * Rozprava. Odpočet je strop, ne norma: často se vypovídá dřív a čekat na
 * nulu je otrava. Většina živých ho proto může utnout.
 *
 * Kdo už chce dál, je vidět. Je to nátlak sám o sobě a zároveň informace
 * do hry: kdo pořád spěchá pryč od rozpravy, si toho možná moc nepřeje.
 */
export function Rozprava({ sekundy, celkem, hlasovani, onDal, onChciDal }: {
  sekundy: number; celkem: number;
  /** null na jednom telefonu, tam rozhoduje ten, kdo ho drží. */
  hlasovani: { kolik: number; potreba: number; jaChci: boolean } | null;
  onDal: () => void;
  onChciDal: () => void;
}) {
  const obsah = (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.34em', color: 'var(--text-tlum)' }}>ROZPRAVA</span>
        <Odpocet sekundy={sekundy} obri />
      </div>

      <div style={{ width: 200, height: 5, background: 'var(--ocel-600)' }}>
        <div style={{ width: `${Math.round((sekundy / Math.max(1, celkem)) * 100)}%`, height: 5, background: 'var(--rez-400)', transition: 'width 1s linear' }} />
      </div>

      <div style={{ border: '4px solid var(--ram)', padding: '20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="5" y="2" width="14" height="20" rx="2.5" stroke="var(--ocel-300)" strokeWidth="2" />
          <path d="M10 18h4" stroke="var(--ocel-300)" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span style={{ fontFamily: 'var(--font-nadpis)', fontSize: 25, letterSpacing: '0.2em' }}>TELEFONY DOLŮ</span>
      </div>

      <div style={{ fontSize: 'var(--t-prose-size)', lineHeight: 'var(--t-prose-lh)', color: 'var(--text-tlum)', textAlign: 'center', maxWidth: 265 }}>
        Kdo byl na které šichtě si musíte připomenout nahlas. Přehled je teď zamčený.
      </div>
    </>
  );

  if (!hlasovani) {
    return (
      <Obrazovka tmava>
        <button
          type="button" onClick={onDal} aria-label="Ukončit rozpravu"
          style={{
            flexGrow: 1, border: 'none', background: 'none', padding: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32,
          }}
        >
          {obsah}
        </button>
      </Obrazovka>
    );
  }

  const zbyva = Math.max(0, hlasovani.potreba - hlasovani.kolik);

  return (
    <Obrazovka tmava>
      <div style={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
        {obsah}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <Tlacitko
          druh={hlasovani.jaChci ? 'hlavni' : 'vedlejsi'}
          vyska={74}
          onClick={onChciDal}
        >
          {hlasovani.jaChci ? 'CHCEŠ DÁL' : 'MÁM DOST ŘEČÍ'}
        </Tlacitko>
        <div style={{ textAlign: 'center', fontSize: 'var(--t-meta-size)', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-tlum)' }}>
          {hlasovani.kolik} z {hlasovani.potreba}
          {zbyva > 0 ? ` · chybí ještě ${zbyva}` : ' · rozprava končí'}
        </div>
      </div>
    </Obrazovka>
  );
}

// ---------------------------------------------------------------- nominace

/**
 * Nominace. **Nominovat nikoho je plnohodnotný tah**, ne zapomenutí. Bez toho
 * by musel každý někoho navrhnout, což zaprvé nutí lidi střílet naslepo a
 * zadruhé rozbíjí šeptandu: věta "v kole 2 nominoval právě jeden sabotér"
 * nic neříká, když museli nominovat všichni.
 */
export function Nominace({ kdo, jaId, vybrany, sekundy, nenominuju, onVybrat, onNikoho, onPotvrdit }: {
  kdo: Kdo[]; jaId: string; vybrany: string | null; sekundy: number | null;
  nenominuju: boolean;
  onVybrat: (id: string) => void; onNikoho: () => void; onPotvrdit: () => void;
}) {
  const cil = kdo.find((k) => k.id === vybrany);
  return (
    <Obrazovka>
      <Hlavicka nadpis="NOMINACE" vpravo={<Odpocet sekundy={sekundy} />} />
      <Veta>Koho chceš před radu? Nominují všichni naráz.</Veta>

      <Rostouci style={{ gap: 9 }}>
        {kdo.filter((k) => k.zivy).map((k) => (
          <Volba
            key={k.id} zvoleno={k.id === vybrany} vypnuto={k.id === jaId}
            onClick={() => onVybrat(k.id)}
            vpravo={k.id === jaId ? <Stitek tlumeny>TO JSI TY</Stitek> : undefined}
          >
            {k.jmeno.toUpperCase()}
          </Volba>
        ))}
      </Rostouci>

      <Poznamka>
        Před radu jdou dva s nejvíc nominacemi. Sebe nominovat nejde. Když
        nenominuje nikdo, tohle kolo nikdo neodejde.
      </Poznamka>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <Tlacitko
          druh={cil ? 'hlavni' : nenominuju ? 'vedlejsi' : 'tichy'}
          vyska={78}
          onClick={cil || nenominuju ? onPotvrdit : undefined}
        >
          {cil ? `NOMINOVAT: ${cil.jmeno.toUpperCase()}` : nenominuju ? 'POTVRDIT' : 'VYBER JEDNOHO'}
        </Tlacitko>
        <Tlacitko druh={nenominuju ? 'hlavni' : 'tichy'} vyska={58} onClick={onNikoho}>
          {nenominuju ? 'NENOMINUJU NIKOHO' : 'NIKOHO NENOMINOVAT'}
        </Tlacitko>
      </div>
    </Obrazovka>
  );
}

// ---------------------------------------------------------------- kandidáti

export function Kandidati({ kandidati, nepostupuji, podil, onPreskocit }: {
  kandidati: { jmeno: string; hlasu: number }[];
  nepostupuji: { jmeno: string; hlasu: number }[];
  podil: number; onPreskocit?: () => void;
}) {
  return (
    <Obrazovka>
      <Hlavicka nadpis="PŘED RADU" vpravo={<Stitek tlumeny>JDOU DVA</Stitek>} />

      <Rostouci style={{ justifyContent: 'center', gap: 14 }}>
        {kandidati.map((k, i) => (
          <Blok
            key={k.jmeno} silny akcentni
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', animation: `vyjet 240ms ease-out ${i * 120}ms both` }}
          >
            <span style={{ fontFamily: 'var(--font-nadpis)', fontSize: 34, letterSpacing: '0.03em' }}>{k.jmeno.toUpperCase()}</span>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-nadpis)', fontSize: 40, lineHeight: 1, color: 'var(--text-akcent)' }}>{k.hlasu}</div>
              <Popisek>NOMINACE</Popisek>
            </div>
          </Blok>
        ))}

        {nepostupuji.length > 0 && (
          <div style={{ marginTop: 10, borderTop: '2px solid var(--ram-tlum)', paddingTop: 14 }}>
            <Popisek>NEPOSTUPUJÍ</Popisek>
            <div style={{ marginTop: 9, display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {nepostupuji.map((n) => (
                <span key={n.jmeno} style={{ fontFamily: 'var(--font-nadpis)', fontSize: 17, border: '2px solid var(--ram-tlum)', color: 'var(--ocel-400)', padding: '6px 10px' }}>
                  {n.jmeno.toUpperCase()} · {n.hlasu}
                </span>
              ))}
            </div>
          </div>
        )}
      </Rostouci>

      <Poznamka>Teď máte poslední slovo. Oba dostanou třicet vteřin na obhajobu.</Poznamka>
      <Ukazatel podil={podil} onPreskocit={onPreskocit} />
    </Obrazovka>
  );
}

// ---------------------------------------------------------------- poslední slovo

export function PosledniSlovo({ mluvi, potom, sekundy, podil, onPreskocit }: {
  mluvi: string; potom: string | null; sekundy: number; podil: number; onPreskocit?: () => void;
}) {
  return (
    <Obrazovka tmava>
      <Hlavicka nadpis="POSLEDNÍ SLOVO" vpravo={<Stitek tlumeny>PŘED RADOU</Stitek>} />

      <div style={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 24 }}>
        <Popisek>TEĎ MLUVÍ</Popisek>
        <div style={{ border: '4px solid var(--rez-400)', background: 'rgba(232,139,69,0.12)', padding: '26px 30px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-nadpis)', fontSize: 52, lineHeight: 0.94, letterSpacing: '0.02em', color: 'var(--text-akcent)' }}>
            {mluvi.toUpperCase()}
          </div>
        </div>
        <Odpocet sekundy={sekundy} obri />
      </div>

      {potom && (
        <Blok style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Popisek>POTOM DOSTANE SLOVO</Popisek>
            <div style={{ marginTop: 3, fontFamily: 'var(--font-nadpis)', fontSize: 24, letterSpacing: '0.03em', color: 'var(--ocel-400)' }}>
              {potom.toUpperCase()}
            </div>
          </div>
        </Blok>
      )}

      <Poznamka>Ostatní teď mlčí. Ptát se můžete až po hlasování.</Poznamka>
      <Ukazatel podil={podil} onPreskocit={onPreskocit} />
    </Obrazovka>
  );
}

// ---------------------------------------------------------------- rada

/**
 * Rada. Zdržet se je taky tah: při rovnosti hlasů nikdo neodchází, takže
 * kolo bez vyhoštění je legitimní výsledek. Stín, který se zdrží, svůj
 * jediný hlas neutratí.
 */
export function Rada({ kandidati, vybrany, sekundy, jsemStin, hlasUtracen, zdrzelSe, onVybrat, onZdrzet, onPotvrdit }: {
  kandidati: Kdo[]; vybrany: string | null; sekundy: number | null;
  jsemStin: boolean; hlasUtracen: boolean; zdrzelSe: boolean;
  onVybrat: (id: string) => void; onZdrzet: () => void; onPotvrdit: () => void;
}) {
  const muzeHlasovat = !jsemStin || !hlasUtracen;
  return (
    <Obrazovka>
      <Hlavicka nadpis="RADA" vpravo={<Odpocet sekundy={sekundy} />} />

      {jsemStin ? (
        <Poznamka varovna={!hlasUtracen}>
          {hlasUtracen
            ? 'Svůj hlas stínu jsi už utratil. Mluvit můžeš dál, hlasovat ne.'
            : 'Máš jeden hlas stínu na celý zbytek hry. Jakmile ho použiješ, je pryč.'}
        </Poznamka>
      ) : (
        <Veta>Kdo dnes odchází? Hlasy uvidí celý stůl.</Veta>
      )}

      <Rostouci style={{ justifyContent: 'center', gap: 12 }}>
        {kandidati.map((k) => (
          <Tlacitko
            key={k.id} vyska={128} zvoleno={k.id === vybrany}
            druh={muzeHlasovat ? 'vedlejsi' : 'tichy'}
            onClick={muzeHlasovat ? () => onVybrat(k.id) : undefined}
          >
            {k.jmeno.toUpperCase()}
          </Tlacitko>
        ))}
      </Rostouci>

      <Poznamka>Při rovnosti neodchází nikdo. Zdržet se je taky odpověď.</Poznamka>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <Tlacitko
          druh={(vybrany || zdrzelSe) && muzeHlasovat ? 'hlavni' : 'tichy'}
          vyska={78}
          onClick={(vybrany || zdrzelSe) && muzeHlasovat ? onPotvrdit : undefined}
        >
          {zdrzelSe && !vybrany ? 'POTVRDIT' : jsemStin ? 'UTRATIT HLAS STÍNU' : 'ODEVZDAT HLAS'}
        </Tlacitko>
        {muzeHlasovat && (
          <Tlacitko druh={zdrzelSe ? 'hlavni' : 'tichy'} vyska={58} onClick={onZdrzet}>
            {zdrzelSe ? 'ZDRŽUJU SE' : 'ZDRŽET SE HLASOVÁNÍ'}
          </Tlacitko>
        )}
      </div>
    </Obrazovka>
  );
}

// ---------------------------------------------------------------- odhalení hlasů

export interface Hlas { kdo: string; komu: string; stin?: boolean }

export function Hlasy({ kandidati, hlasy, odkryto, tma, podil, onPreskocit }: {
  kandidati: { jmeno: string; hlasu: number; vede: boolean }[];
  hlasy: Hlas[]; odkryto: number; tma: boolean; podil: number; onPreskocit?: () => void;
}) {
  if (tma) {
    return (
      <Obrazovka tmava>
        <Hlavicka nadpis="RADA" vpravo={<Stitek tlumeny>TMA</Stitek>} />
        <div style={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 22 }}>
          <div style={{ fontFamily: 'var(--font-nadpis)', fontSize: 40, lineHeight: 1.05, color: 'var(--ocel-50)' }}>
            DNES SE NEDOZVÍTE,<br />KDO KOHO VOLIL.
          </div>
          <Poznamka varovna>Někdo se postaral o to, aby hlasování zůstalo potmě.</Poznamka>
        </div>
        <Ukazatel podil={podil} onPreskocit={onPreskocit} />
      </Obrazovka>
    );
  }

  return (
    <Obrazovka>
      <Hlavicka nadpis="RADA" vpravo={<Stitek tlumeny>KDO KOHO VOLIL</Stitek>} />

      <div style={{ display: 'flex', gap: 11 }}>
        {kandidati.map((k) => (
          <div key={k.jmeno} style={{ flexGrow: 1, border: `4px solid ${k.vede ? 'var(--rez-400)' : 'var(--ram)'}`, padding: 12, textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-nadpis)', fontSize: 20, letterSpacing: '0.03em', color: k.vede ? 'var(--text)' : 'var(--text-tlum)' }}>
              {k.jmeno.toUpperCase()}
            </div>
            <div style={{ fontFamily: 'var(--font-nadpis)', fontSize: 32, color: k.vede ? 'var(--text-akcent)' : 'var(--text-tlum)' }}>{k.hlasu}</div>
          </div>
        ))}
      </div>

      <Rostouci style={{ gap: 7 }}>
        {hlasy.map((h, i) => {
          const viditelny = i < odkryto;
          return (
            <div
              key={`${h.kdo}-${i}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px', flexShrink: 0,
                borderLeft: `4px ${viditelny ? 'solid' : 'dashed'} ${
                  viditelny ? (h.stin ? 'var(--rez-700)' : 'var(--ram-silny)') : 'var(--ram-tlum)'
                }`,
                background: viditelny ? (h.stin ? 'rgba(122,52,16,0.20)' : 'rgba(0,0,0,0.22)') : 'transparent',
                animation: viditelny ? 'vyjet 220ms ease-out' : undefined,
              }}
            >
              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontFamily: 'var(--font-nadpis)', fontSize: 18, color: viditelny ? 'var(--text)' : 'var(--ram-tlum)' }}>
                  {h.kdo.toUpperCase()}
                </span>
                {viditelny && h.stin && (
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: 'var(--rez-500)' }}>HLAS STÍNU · UTRACEN</span>
                )}
              </div>
              {viditelny ? (
                <>
                  <svg width="20" height="12" viewBox="0 0 20 12" fill="none" aria-hidden="true">
                    <path d="M0 6h17M12 1l5 5-5 5" stroke={h.stin ? 'var(--rez-500)' : 'var(--ocel-300)'} strokeWidth="2" />
                  </svg>
                  <span style={{ fontFamily: 'var(--font-nadpis)', fontSize: 18, color: 'var(--text-akcent)' }}>{h.komu.toUpperCase()}</span>
                </>
              ) : (
                <span style={{ fontFamily: 'var(--font-nadpis)', fontSize: 18, color: 'var(--ram-tlum)', letterSpacing: '0.3em' }}>···</span>
              )}
            </div>
          );
        })}
      </Rostouci>

      <div style={{ fontSize: 'var(--t-meta-size)', fontWeight: 600, color: 'var(--text-tlum)', textAlign: 'center' }}>
        {odkryto >= hlasy.length ? 'Všechno je venku.' : `Odkrývá se po jednom. Zbývá ${hlasy.length - odkryto}.`}
      </div>

      <Ukazatel podil={podil} onPreskocit={onPreskocit} />
    </Obrazovka>
  );
}

// ---------------------------------------------------------------- vyhoštění

export function Vyhosteni({ kolo, kdo, role, zbyvaSaboteru, zivych, podil, onPreskocit }: {
  kolo: number; kdo: string | null; role: 'pracant' | 'saboter' | null;
  zbyvaSaboteru: number; zivych: number; podil: number; onPreskocit?: () => void;
}) {
  return (
    <Obrazovka tmava>
      <Hlavicka nadpis="VYHOŠTĚNÍ" vpravo={<Stitek tlumeny>ŠICHTA {kolo}</Stitek>} />

      <div style={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 24 }}>
        {kdo ? (
          <>
            <div style={{ textAlign: 'center' }}>
              <Popisek>STŮL POSLAL PRYČ</Popisek>
              <div style={{ marginTop: 10, fontFamily: 'var(--font-nadpis)', fontSize: 58, lineHeight: 0.94, letterSpacing: '0.02em', color: 'var(--ocel-50)' }}>
                {kdo.toUpperCase()}
              </div>
            </div>

            {/* Role je na neutrální bílé. Patina a spál popisují šichtu, nikdy člověka. */}
            <Razitko nadpis={role === 'saboter' ? 'SABOTÉR' : 'PRACANT'} popisek="ROLE" naklon={1.4} />

            <Poznamka>
              {role === 'saboter'
                ? zbyvaSaboteru === 0
                  ? 'To byl poslední.'
                  : `Zbývá ${zbyvaSaboteru === 1 ? 'jeden sabotér' : `${zbyvaSaboteru} sabotéři`}.`
                : 'Pracant. Sabotéři zůstali všichni.'}{' '}
              {kdo} zůstává u stolu, mluví dál a má jeden hlas stínu na zbytek hry.
            </Poznamka>
          </>
        ) : (
          <>
            <Razitko nadpis="NIKDO" popisek="STŮL SE NESHODL" />
            <Poznamka>Rovnost hlasů. Dneska nikdo neodchází a vám ubyla jedna šichta.</Poznamka>
          </>
        )}
      </div>

      <Blok silny style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Popisek>ŽIVÝCH</Popisek>
        <span style={{ fontFamily: 'var(--font-nadpis)', fontSize: 28, color: 'var(--text-akcent)' }}>{zivych}</span>
      </Blok>

      <Ukazatel podil={podil} onPreskocit={onPreskocit} />
    </Obrazovka>
  );
}
