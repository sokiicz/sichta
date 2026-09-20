import type { Akce } from '../game/types';
import type { Pohled } from '../game/pohled';

/**
 * WebSocket klient k Durable Objectu.
 *
 * Telefon se uspí po pár vteřinách a iOS Safari kartu odloží. Proto se
 * nespoléháme na to, že spojení vydrží: stav drží server a my se jen
 * znovu připojíme podle tokenu v localStorage. Nic se neztratí, protože
 * klient si sám nic nepamatuje.
 */

export type StavSite = 'pripojuji' | 'pripojen' | 'odpojen';

const KLIC_TOKEN = 'sichta:token';

export function mujToken(): string {
  let t = localStorage.getItem(KLIC_TOKEN);
  if (!t) {
    t = crypto.randomUUID();
    localStorage.setItem(KLIC_TOKEN, t);
  }
  return t;
}

/**
 * V produkci appku servíruje ten samý worker, co drží API, takže se adresa
 * nikam nepíše a nemůže se rozejít. Ve vývoji běží Vite na jiném portu,
 * tam se musí říct přes VITE_WORKER_URL v .env.local. Prázdný řetězec
 * znamená "síť není nastavená" a nabídne se jen hra na jednom telefonu.
 */
export const zakladnaUrl = (): string => {
  if (import.meta.env.PROD) return window.location.origin;
  return (import.meta.env['VITE_WORKER_URL'] as string | undefined)?.replace(/\/$/, '') ?? '';
};

export async function zalozitMistnost(): Promise<string> {
  const r = await fetch(`${zakladnaUrl()}/api/mistnost`, { method: 'POST' });
  if (!r.ok) throw new Error('Šichtu se nepodařilo založit.');
  const d = (await r.json()) as { kod: string };
  return d.kod;
}

interface Nastaveni {
  kod: string;
  jmeno: string;
  onPohled: (p: Pohled) => void;
  onStav: (s: StavSite) => void;
}

export class Spojeni {
  private ws: WebSocket | null = null;
  private zavreno = false;
  private pokus = 0;
  private cas: ReturnType<typeof setTimeout> | null = null;

  constructor(private n: Nastaveni) {
    this.pripojit();
    // Návrat z uspaného telefonu je nejčastější důvod výpadku, ne špatná síť.
    document.addEventListener('visibilitychange', this.probudit);
    window.addEventListener('online', this.probudit);
  }

  private probudit = () => {
    if (this.zavreno) return;
    if (document.visibilityState !== 'visible') return;
    if (this.ws?.readyState === WebSocket.OPEN) return;
    this.pokus = 0;
    this.pripojit();
  };

  private pripojit() {
    if (this.zavreno) return;
    const zaklad = zakladnaUrl().replace(/^http/, 'ws');
    const url = `${zaklad}/api/mistnost/${this.n.kod}/ws`
      + `?token=${encodeURIComponent(mujToken())}`
      + `&jmeno=${encodeURIComponent(this.n.jmeno)}`;

    this.n.onStav('pripojuji');
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => { this.pokus = 0; this.n.onStav('pripojen'); };

    ws.onmessage = (e) => {
      try {
        const d = JSON.parse(String(e.data)) as { t: string; p?: Pohled };
        if (d.t === 'pohled' && d.p) this.n.onPohled(d.p);
      } catch {
        // pokažená zpráva se zahodí, další přijde za chvíli
      }
    };

    ws.onclose = () => {
      this.n.onStav('odpojen');
      this.naplanovatZnovu();
    };
    ws.onerror = () => ws.close();
  }

  private naplanovatZnovu() {
    if (this.zavreno || this.cas) return;
    // krátké pokusy hned, pak se odstupuje, ať se nemlátí do zdi
    const prodleva = Math.min(8000, 400 * 2 ** this.pokus++);
    this.cas = setTimeout(() => { this.cas = null; this.pripojit(); }, prodleva);
  }

  poslat(a: Akce) {
    if (this.ws?.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify({ t: 'akce', a }));
    return true;
  }

  zavrit() {
    this.zavreno = true;
    document.removeEventListener('visibilitychange', this.probudit);
    window.removeEventListener('online', this.probudit);
    if (this.cas) clearTimeout(this.cas);
    this.ws?.close();
  }
}
