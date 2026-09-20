import { Blok, Obrazovka, Poznamka, Popisek, Rostouci, Stitek, Tlacitko, Veta, Volba, Zpet } from '../ui/primitives';
import type { Nastaveni } from '../game/types';

/**
 * Nastavení hry. Mění se jen v šatně, po rozdání rolí už ne, protože měnit
 * pravidla za běhu je nejrychlejší způsob, jak partu naštvat.
 *
 * Jsou tu jen volby, které jsou opravdu postavené. Každá má napsané, co
 * dělá a komu to nahrává, aby se zakladatel nemusel rozhodovat poslepu.
 */

interface Volitelna {
  klic: keyof Nastaveni;
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
      + 'i to, že vůbec nějakou má. Ostřejší, ale stačí jednou zaváhat.',
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
      + 'víc lidí a častěji dojde na limit šicht. Hodí se k vypnuté šeptandě '
      + 'pro sabotéry, jinak pracanti odpadnou dřív, než stihnou lháře nachytat.',
  },
];

export function NastaveniHry({ nastaveni, onPrepnout, onZpet }: {
  nastaveni: Nastaveni;
  onPrepnout: (klic: keyof Nastaveni, hodnota: boolean) => void;
  onZpet: () => void;
}) {
  return (
    <Obrazovka>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, borderBottom: '3px solid var(--ram)', paddingBottom: 12 }}>
        <Zpet onClick={onZpet} />
        <h1 style={{ margin: 0, fontFamily: 'var(--font-nadpis)', fontWeight: 400, fontSize: 26, letterSpacing: '0.05em' }}>
          NASTAVENÍ HRY
        </h1>
      </div>

      <Rostouci style={{ gap: 16 }}>
        {VOLBY.map((v) => {
          const zap = nastaveni[v.klic];
          return (
            <div key={v.klic} style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Volba
                onClick={() => onPrepnout(v.klic, !zap)}
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
            Počet sabotérů, velikost party a limit šicht se dopočítají podle
            toho, kolik vás je. Ta čísla jsou výsledek simulace, ne odhad.
          </Veta>
        </Blok>
      </Rostouci>

      <Poznamka>Po rozdání rolí už se nastavení měnit nedá.</Poznamka>
      <Tlacitko druh="hlavni" vyska={76} onClick={onZpet}>HOTOVO</Tlacitko>
    </Obrazovka>
  );
}
