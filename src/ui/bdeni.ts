import { useEffect } from 'react';
import { zaznamenat } from './telemetrie';

/**
 * Wake lock. Během rozpravy leží telefony lícem dolů čtyři minuty a bez
 * tohohle se zamknou, iOS uspí kartu a spojení spadne. Displej tedy svítí,
 * dokud hra běží; zhasne se sám po opuštění hry.
 *
 * Prohlížeč zámek pustí, jakmile karta zmizí z popředí. Po návratu se
 * žádá znovu. Kde API není, nic se nestane a hra běží dál bez něj.
 */
export function useBdeni(aktivni: boolean) {
  useEffect(() => {
    if (!aktivni || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
    let zamek: WakeLockSentinel | null = null;
    let zruseno = false;

    const pozadat = async () => {
      if (zruseno || document.visibilityState !== 'visible') return;
      try {
        zamek = await navigator.wakeLock.request('screen');
        zaznamenat('bdeni', { detail: 'ok' });
      } catch {
        // nízká baterie nebo zákaz prohlížeče: hra běží i bez toho
        zaznamenat('bdeni', { detail: 'odmitnuto' });
      }
    };
    const naViditelnost = () => { if (document.visibilityState === 'visible') void pozadat(); };

    void pozadat();
    document.addEventListener('visibilitychange', naViditelnost);
    return () => {
      zruseno = true;
      document.removeEventListener('visibilitychange', naViditelnost);
      void zamek?.release().catch(() => undefined);
      zamek = null;
    };
  }, [aktivni]);
}
