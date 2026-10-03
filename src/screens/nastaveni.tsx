import { Blok, Obrazovka, Poznamka, Popisek, Rostouci, Stitek, Tlacitko, Veta, Volba, Zpet } from '../ui/primitives';
import type { Nastaveni, Uroven } from '../game/types';
import {
  delkaFaze, jeDivokaSestava, LIMIT_POSUN_MAX, LIMIT_POSUN_MIN, MIN_HRACU, odhadPro, sestavaPro, UROVEN_TEXT, UROVNE,
} from '../game/rules';

/**
 * Nastavení hry. Mění se jen v šatně, po rozdání rolí už ne, protože měnit
 * pravidla za běhu je nejrychlejší způsob, jak partu naštvat.
 *
 * Jsou tu jen volby, které jsou opravdu postavené. Každá má napsané, co
 * dělá a komu to nahrává, aby se zakladatel nemusel rozhodovat poslepu.
 */

interface Volitelna {
  klic: 'septandaProSabotery' | 'vrazdy';
  nadpis: string;
  zapnuto: string;
  vypnuto: string;
  popis: string;
  varovani?: string;
}

const VOLBY: Volitelna[] = [
  {
    klic: 'septandaProSabotery',
    nadpis: 'ŠEPTANDA PRO VŠECHNY',
    zapnuto: 'VŠEM',
    vypnuto: 'JEN PRACANTŮM',
    popis:
      'Zapnuto dostane větu i sabotér. Je mu k ničemu, protože role zná, takže '
      + 'si musí vymyslet jinou. Nikoho nejde nachytat na to, že žádnou nemá.',
    varovani:
      'Vypnuto je špionská varianta: sabotér nedostane nic a musí si vymyslet '
      + 'i to, že vůbec nějakou má. Ostřejší, ale stačí jednou zaváhat. '
      + 'Pracantům to mírně pomáhá.',
  },
  {
    klic: 'vrazdy',
    nadpis: 'NOČNÍ VRAŽDY',
    zapnuto: 'ZAPNUTÉ',
    vypnuto: 'VYPNUTÉ',
    popis:
      'Za padlou šichtu si sabotéři vybírají odměnu. Vražda je z nich nejsilnější.',
    varovani:
      'Vypnuto se odchází jen vyhoštěním. Hra je delší, u stolu zůstane sedět '
      + 'víc lidí a častěji dojde na limit šicht. Pozor: sabotéři si pak berou '
      + 'imunitu, která zablokuje celou radu, takže to hře spíš ubírá na '
      + 'spravedlnosti pro pracanty (simulace: o 7 až 10 bodů míň výher).',
  },
];

const procent = (x: number) => `${Math.round(x * 100)} %`;
const kol = (n: number) => (n === 1 ? 'kolo' : n >= 2 && n <= 4 ? 'kola' : 'kol');

/** Co zvolený posun limitu způsobí, napsané tak, aby se podle toho dalo rozhodnout. */
function dusledekPosunu(posun: number): string {
  if (posun === 0) return '';
  if (posun < 0) {
    return 'Kratší hra hraje sabotérům do karet: pracanti mají míň rad na to, aby je našli, '
      + 'a stačí jim přežít. Hodí se, když pracanti vyhrávají skoro pokaždé.';
  }
  return 'Delší hra hraje pracantům do karet: mají víc rad na hledání, ale i víc času na chyby '
    + 'a hra trvá déle. Hodí se, když sabotéři vyhrávají skoro pokaždé.';
}

export function NastaveniHry({ nastaveni, pocetHracu, onZmenit, onZpet }: {
  nastaveni: Nastaveni;
  /** Kolik lidí je teď v šatně. Z toho se počítá doporučení a odhad. */
  pocetHracu: number;
  onZmenit: (zmena: Partial<Nastaveni>) => void;
  onZpet: () => void;
}) {
  const znamN = pocetHracu >= MIN_HRACU;
  const sestava = znamN ? sestavaPro(pocetHracu, nastaveni.uroven, nastaveni.limitPosun) : null;
  const doporuceni = znamN ? odhadPro(pocetHracu, nastaveni.uroven, 0) : null;
  const odhad = znamN ? odhadPro(pocetHracu, nastaveni.uroven, nastaveni.limitPosun) : null;
  const rozpravaSekund = sestava ? delkaFaze('rozprava', pocetHracu, 2, sestava.rozprava) : null;
  const posun = nastaveni.limitPosun;

  return (
    <Obrazovka>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, borderBottom: '3px solid var(--ram)', paddingBottom: 12 }}>
        <Zpet onClick={onZpet} />
        <h1 style={{ margin: 0, fontFamily: 'var(--font-nadpis)', fontWeight: 400, fontSize: 26, letterSpacing: '0.05em' }}>
          NASTAVENÍ HRY
        </h1>
      </div>

      <Rostouci style={{ gap: 16 }}>
        <Blok popisek="KDO SEDÍ U STOLU">
          {UROVNE.map((u: Uroven) => (
            <Volba
              key={u}
              zvoleno={nastaveni.uroven === u}
              onClick={() => onZmenit({ uroven: u, limitPosun: 0 })}
              popis={`Úroveň stolu: ${UROVEN_TEXT[u].nazev}`}
            >
              {UROVEN_TEXT[u].nazev}
            </Volba>
          ))}
          <Veta>{UROVEN_TEXT[nastaveni.uroven].popis}</Veta>
          <Poznamka>
            Zkušený sabotér proti nováčkům vyhrává skoro vždy a naopak. Podle úrovně se proto
            ladí limit šicht a délka rozpravy, ať má každý stůl zhruba stejnou šanci.
          </Poznamka>
        </Blok>

        <Blok popisek="LIMIT ŠICHT">
          <div style={{ display: 'flex', alignItems: 'stretch', gap: 10 }}>
            <div style={{ flex: '0 0 72px' }}>
              <Tlacitko
                vyska={62}
                popis="Ubrat kolo"
                onClick={posun > LIMIT_POSUN_MIN ? () => onZmenit({ limitPosun: posun - 1 }) : undefined}
                druh={posun > LIMIT_POSUN_MIN ? 'vedlejsi' : 'tichy'}
              >
                −
              </Tlacitko>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
              <span style={{ fontFamily: 'var(--font-nadpis)', fontSize: 30, letterSpacing: '0.06em', color: 'var(--text-akcent)' }}>
                {sestava ? `${sestava.limitSicht} ${kol(sestava.limitSicht).toUpperCase()}` : '?'}
              </span>
              <Stitek tlumeny>
                {sestava ? (posun === 0 ? 'DOPORUČENO' : `DOPORUČENO ${sestava.doporucenyLimit}`) : `OD ${MIN_HRACU} HRÁČŮ`}
              </Stitek>
            </div>
            <div style={{ flex: '0 0 72px' }}>
              <Tlacitko
                vyska={62}
                popis="Přidat kolo"
                onClick={posun < LIMIT_POSUN_MAX ? () => onZmenit({ limitPosun: posun + 1 }) : undefined}
                druh={posun < LIMIT_POSUN_MAX ? 'vedlejsi' : 'tichy'}
              >
                +
              </Tlacitko>
            </div>
          </div>

          {sestava && (
            <Veta>
              {pocetHracu} hráčů: {sestava.saboteri} {sestava.saboteri === 1 ? 'sabotér' : sestava.saboteri < 5 ? 'sabotéři' : 'sabotérů'}
              {rozpravaSekund ? `, rozprava ${Math.round(rozpravaSekund / 60 * 10) / 10} min` : ''}.
            </Veta>
          )}

          {odhad && (
            <Poznamka varovna={posun !== 0}>
              {posun === 0
                ? `Doporučení pro tuhle úroveň. Odhad ze simulace: pracanti vyhrají asi ${procent(odhad.pracanti)} partií, hra trvá asi ${odhad.minut} minut.`
                : `O ${Math.abs(posun)} ${kol(Math.abs(posun))} ${posun < 0 ? 'kratší' : 'delší'} než doporučení. `
                  + `Odhad: pracanti vyhrají asi ${procent(odhad.pracanti)} partií`
                  + (doporuceni ? ` (s doporučením ${procent(doporuceni.pracanti)})` : '')
                  + `, hra trvá asi ${odhad.minut} minut`
                  + (doporuceni ? ` (s doporučením ${doporuceni.minut})` : '')
                  + `. ${dusledekPosunu(posun)}`}
            </Poznamka>
          )}
          {znamN && !odhad && <Poznamka>K téhle velikosti stolu zatím nemám odhad.</Poznamka>}
          {!znamN && <Poznamka>Odhad se ukáže, až budou u stolu aspoň {MIN_HRACU} lidé.</Poznamka>}
          {znamN && jeDivokaSestava(pocetHracu) && (
            <Poznamka varovna>
              Pětka je tréninková partie: jeden sabotér a krátký limit. Vyvážit ji nejde.
            </Poznamka>
          )}
          <Poznamka>
            Doporučení platí pro typický stůl dané úrovně. Když vám dvě partie za sebou vyhráli jen
            sabotéři, přidejte kolo. Když jen pracanti, ubrat.
          </Poznamka>
        </Blok>

        {VOLBY.map((v) => {
          const zap = nastaveni[v.klic];
          return (
            <div key={v.klic} style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Volba
                onClick={() => onZmenit({ [v.klic]: !zap })}
                popis={`${v.nadpis}: ${zap ? v.zapnuto : v.vypnuto}`}
                vpravo={<Stitek tlumeny>{zap ? v.zapnuto : v.vypnuto}</Stitek>}
              >
                {v.nadpis}
              </Volba>
              <Veta>{zap ? v.popis : v.varovani ?? v.popis}</Veta>
            </div>
          );
        })}

        <Blok>
          <Popisek>CO SE NEMĚNÍ</Popisek>
          <Veta>
            Počet sabotérů a velikost party se dopočítají podle toho, kolik vás je. Ta čísla
            jsou výsledek simulace, ne odhad.
          </Veta>
        </Blok>
      </Rostouci>

      <Poznamka>Po rozdání rolí už se nastavení měnit nedá.</Poznamka>
      <Tlacitko druh="hlavni" vyska={76} onClick={onZpet}>HOTOVO</Tlacitko>
    </Obrazovka>
  );
}
