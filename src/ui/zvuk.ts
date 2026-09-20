/**
 * Zvuk a haptika.
 *
 * Žádné zvukové soubory: všechno se generuje přes WebAudio, takže to nestojí
 * ani bajt z rozpočtu načítání (obrazovky.md §4) a nic se nemusí předstahovat.
 *
 * Pravidlo značky platí i tady: **zvuk nikdy neprozradí roli.** Hraje ve stejnou
 * chvíli a stejně všem. Sabotér a pracant slyší tutéž houkačku.
 *
 * Kdo hraje nahlas: na jednom telefonu ten jeden, po síti jen zakladatel.
 * Osm telefonů houkajících naráz je rámus, ne atmosféra. Haptika naopak jede
 * všem, protože je tichá a soukromá.
 */

import { useEffect, useRef } from 'react';
import type { Pohled } from '../game/pohled';

export type Zvuk =
  | 'houkacka'   // začátek šichty, nejvýraznější zvuk ve hře
  | 'klepnuti'   // potvrzení volby
  | 'proslo'     // šichta prošla
  | 'prusvih'    // šichta padla
  | 'rana';      // noc si někoho vzala

const KLIC = 'sichta-zvuk';

let kontext: AudioContext | null = null;
let zapnuty = ((): boolean => {
  try { return localStorage.getItem(KLIC) !== 'ne'; } catch { return true; }
})();

export function zvukZapnuty(): boolean {
  return zapnuty;
}

export function prepnoutZvuk(): boolean {
  zapnuty = !zapnuty;
  try { localStorage.setItem(KLIC, zapnuty ? 'ano' : 'ne'); } catch { /* soukromé okno */ }
  if (zapnuty) zahrat('klepnuti');
  return zapnuty;
}

/**
 * AudioContext smí vzniknout až po doteku, jinak ho prohlížeč uspí. Proto se
 * zakládá líně, při prvním zvuku, a po návratu z pozadí se budí znovu.
 */
function ozvucnice(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Konstruktor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Konstruktor) return null;
  if (!kontext) {
    try { kontext = new Konstruktor(); } catch { return null; }
  }
  if (kontext.state === 'suspended') void kontext.resume();
  return kontext;
}

interface Ton {
  tvar: OscillatorType;
  od: number;
  do?: number;
  start: number;
  delka: number;
  hlasitost: number;
}

function prehrat(tony: Ton[]) {
  const ctx = ozvucnice();
  if (!ctx) return;
  const ted = ctx.currentTime;

  for (const t of tony) {
    const osc = ctx.createOscillator();
    const zesileni = ctx.createGain();
    osc.type = t.tvar;

    const zacatek = ted + t.start;
    const konec = zacatek + t.delka;
    osc.frequency.setValueAtTime(t.od, zacatek);
    if (t.do != null) osc.frequency.exponentialRampToValueAtTime(Math.max(t.do, 1), konec);

    // náběh krátký, doznění dlouhé: bez toho to lupe
    zesileni.gain.setValueAtTime(0.0001, zacatek);
    zesileni.gain.exponentialRampToValueAtTime(t.hlasitost, zacatek + Math.min(0.03, t.delka / 3));
    zesileni.gain.exponentialRampToValueAtTime(0.0001, konec);

    osc.connect(zesileni).connect(ctx.destination);
    osc.start(zacatek);
    osc.stop(konec + 0.02);
  }
}

/** Tovární zvuky: hranaté vlny a nízké tóny. Nic sladkého. */
const RECEPTY: Record<Zvuk, Ton[]> = {
  houkacka: [
    { tvar: 'square', od: 110, start: 0, delka: 1.1, hlasitost: 0.16 },
    { tvar: 'square', od: 165, start: 0.02, delka: 1.05, hlasitost: 0.1 },
    { tvar: 'sawtooth', od: 55, start: 0, delka: 1.2, hlasitost: 0.07 },
  ],
  klepnuti: [
    { tvar: 'square', od: 520, do: 380, start: 0, delka: 0.07, hlasitost: 0.09 },
  ],
  proslo: [
    { tvar: 'square', od: 392, start: 0, delka: 0.12, hlasitost: 0.11 },
    { tvar: 'square', od: 587, start: 0.11, delka: 0.26, hlasitost: 0.11 },
  ],
  prusvih: [
    { tvar: 'sawtooth', od: 330, do: 124, start: 0, delka: 0.5, hlasitost: 0.13 },
    { tvar: 'square', od: 110, start: 0.06, delka: 0.44, hlasitost: 0.07 },
  ],
  rana: [
    { tvar: 'triangle', od: 140, do: 48, start: 0, delka: 0.55, hlasitost: 0.2 },
    { tvar: 'sawtooth', od: 70, do: 40, start: 0, delka: 0.3, hlasitost: 0.1 },
  ],
};

export function zahrat(z: Zvuk) {
  if (!zapnuty) return;
  prehrat(RECEPTY[z]);
}

/**
 * Vibrace. Na iOS `navigator.vibrate` není, takže se tiše nic nestane.
 * Volá se i tam, kde zvuk mlčí, protože haptiku cítí jen ten, kdo drží telefon.
 *
 * Chrome vibraci odmítne a vypíše chybu do konzole, dokud se člověk poprvé
 * nedotkne stránky. Vibrace z odpočtu tam přitom doběhnou i dřív, takže si
 * první dotek pamatujeme a do té doby mlčíme.
 */
let bylDotek = false;
if (typeof window !== 'undefined') {
  const zapsat = () => { bylDotek = true; };
  window.addEventListener('pointerdown', zapsat, { once: true, capture: true });
  window.addEventListener('keydown', zapsat, { once: true, capture: true });
}

export function vibrovat(vzor: number | readonly number[]) {
  if (!bylDotek) return;
  try { navigator.vibrate?.(typeof vzor === 'number' ? vzor : [...vzor]); } catch { /* prohlížeč to nemusí umět */ }
}

export const VZOR = {
  klepnuti: 14,
  faze: [30, 70, 30],
  spatne: [220],
  konec: [60, 80, 60, 80, 220],
} as const;

// ---------------------------------------------------------------- ozvučení fáze

/**
 * Jeden zvuk na jeden přechod fáze. Sound i haptika se odvíjejí výhradně
 * z veřejných údajů v pohledu, takže je nemůže rozladit role toho, kdo poslouchá.
 *
 * `hlasite` rozhoduje jen o reproduktoru. Vibruje se vždycky.
 */
export function useOzvuceni(pohled: Pohled | null, hlasite: boolean) {
  const minule = useRef<string | null>(null);

  useEffect(() => {
    if (!pohled) return;
    const klic = `${pohled.kolo}-${pohled.faze}`;
    if (minule.current === klic) return;
    // první vykreslení nemá co ozvučovat, jinak to houkne hned po otevření
    const prvni = minule.current === null;
    minule.current = klic;
    if (prvni) return;

    switch (pohled.faze) {
      case 'zadani':
        if (hlasite) zahrat('houkacka');
        vibrovat(VZOR.faze);
        break;
      case 'vysledek':
        if (hlasite) zahrat(pohled.stul.padla ? 'prusvih' : 'proslo');
        vibrovat(pohled.stul.padla ? VZOR.spatne : VZOR.faze);
        break;
      case 'vyhosteni':
        if (hlasite) zahrat('rana');
        vibrovat(VZOR.spatne);
        break;
      case 'rano':
        if (pohled.stul.obet) {
          if (hlasite) zahrat('rana');
          vibrovat(VZOR.spatne);
        } else {
          vibrovat(VZOR.faze);
        }
        break;
      case 'konec':
        if (hlasite) zahrat('houkacka');
        vibrovat(VZOR.konec);
        break;
      default:
        vibrovat(VZOR.faze);
    }
  }, [pohled, hlasite]);
}
