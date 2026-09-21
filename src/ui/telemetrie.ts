/**
 * Měření chování v aplikaci. Bez cookies, bez třetích stran.
 *
 * Události se sbírají do fronty a posílají dávkou na `/api/udalost`, kde je
 * worker zapíše do Workers Analytics Engine. Neposílá se nic, co by šlo
 * spojit s člověkem: jen kód místnosti, id hráče v ní (h1, h2...), náhodné
 * id načtení stránky a krátké zařízení (iOS, Android, počítač). Za
 * identifikátor telefonu slouží prvních osm znaků herního tokenu, který
 * v telefonu už je kvůli návratu do hry; díky němu jde poznat, že se stejný
 * telefon vrátil na další partii. Vypnout to jde jedním řádkem
 * (`ZARIZENI = null`).
 *
 * Co se měří: každá obrazovka a jak dlouho na ní byl telefon, ťuknutí, která
 * nic nedělají (rage klik, mrtvý klik, klik na neaktivní tlačítko), chyby
 * skriptu, výpadky spojení, wake lock, otevření přehledu a zápisníku,
 * sdílení odkazu. Herní události (fáze, výsledky, odměny, konce) zapisuje
 * worker sám, protože je vidí první.
 */

/** Stejně jako v net/klient.ts: v provozu ten samý worker, ve vývoji adresa z .env.local. */
const zakladnaUrl = (): string => {
  if (import.meta.env.PROD) return window.location.origin;
  return (import.meta.env['VITE_WORKER_URL'] as string | undefined)?.replace(/\/$/, '') ?? '';
};

export interface Kontext {
  rezim: 'online' | 'hotseat' | null;
  kod: string | null;
  hrac: string | null;
  faze: string | null;
  kolo: number;
  pocetHracu: number;
}

export interface Udalost {
  typ: string;
  detail?: string;
  detail2?: string;
  hodnota?: number;
  hodnota2?: number;
}

const ADRESA = () => `${zakladnaUrl()}/api/udalost`;
const SEZENI = Math.random().toString(36).slice(2, 10);
const VERZE: string = typeof __VERZE__ === 'string' ? __VERZE__ : 'dev';

/** Prvních osm znaků herního tokenu. Nastav na null a telefon se mezi partiemi nepozná. */
const ZARIZENI: string | null = ((): string | null => {
  try {
    const t = localStorage.getItem('sichta:token');
    return t ? t.slice(0, 8) : null;
  } catch { return null; }
})();

function platforma(): string {
  if (typeof navigator === 'undefined') return '';
  const ua = navigator.userAgent;
  const os = /iPhone|iPad|iPod/.test(ua) ? 'ios' : /Android/.test(ua) ? 'android' : 'pocitac';
  const pwa = window.matchMedia?.('(display-mode: standalone)').matches ? 'pwa' : 'web';
  return `${os}/${pwa}`;
}

let kontext: Kontext = { rezim: null, kod: null, hrac: null, faze: null, kolo: 0, pocetHracu: 0 };
let fronta: (Udalost & { cas: number; kontext: Kontext })[] = [];
let casovac: ReturnType<typeof setTimeout> | null = null;

export function nastavitKontext(k: Partial<Kontext>) {
  kontext = { ...kontext, ...k };
}

/** Zapíše událost. Odešle se do pár vteřin dávkou, při zavření stránky hned. */
export function zaznamenat(typ: string, data: Omit<Udalost, 'typ'> = {}) {
  fronta.push({ typ, ...data, cas: Date.now(), kontext });
  if (fronta.length >= 20) odeslat();
  else if (!casovac) casovac = setTimeout(odeslat, 4000);
}

function odeslat() {
  if (casovac) { clearTimeout(casovac); casovac = null; }
  if (fronta.length === 0) return;
  const adresa = ADRESA();
  if (!adresa.startsWith('http')) { fronta = []; return; }
  const davka = fronta.splice(0, 50);
  const telo = JSON.stringify({
    sezeni: SEZENI,
    zarizeni: ZARIZENI,
    platforma: platforma(),
    verze: VERZE,
    udalosti: davka.map((u) => ({
      typ: u.typ, detail: u.detail, detail2: u.detail2, hodnota: u.hodnota, hodnota2: u.hodnota2,
      cas: u.cas, rezim: u.kontext.rezim, kod: u.kontext.kod, hrac: u.kontext.hrac,
      faze: u.kontext.faze, kolo: u.kontext.kolo, pocetHracu: u.kontext.pocetHracu,
    })),
  });
  try {
    // sendBeacon přežije zavření karty; fetch je záloha pro prohlížeče bez něj
    if (!(navigator.sendBeacon?.(adresa, new Blob([telo], { type: 'application/json' })))) {
      void fetch(adresa, { method: 'POST', body: telo, headers: { 'content-type': 'application/json' }, keepalive: true }).catch(() => undefined);
    }
  } catch {
    // měření nikdy nesmí shodit hru
  }
  if (fronta.length > 0) casovac = setTimeout(odeslat, 1000);
}

// ---------------------------------------------------------------- ťukání, které nic nedělá

interface Klik { cas: number; x: number; y: number }

/**
 * Rage klik: tři a víc ťuknutí do stejného místa během chvilky. Čistá funkce,
 * ať se dá testovat. Vrací true pro ťuknutí, které sérii dovršilo.
 */
export function jeRageKlik(predchozi: readonly Klik[], novy: Klik, okno = 1500, polomer = 40): boolean {
  const blizke = predchozi.filter((k) => novy.cas - k.cas <= okno && Math.hypot(k.x - novy.x, k.y - novy.y) <= polomer);
  return blizke.length >= 2;
}

/**
 * Popis prvku, do kterého se ťuklo: značka a štítek `data-mereni`. Text ani
 * aria-label se neposílá, protože můžou nést přezdívku („Vyhodit Honza").
 */
export function popisCile(cil: EventTarget | null): string {
  if (!(cil instanceof Element)) return '?';
  const ovladaci = cil.closest('button, a, input, textarea, [role="button"]');
  const prvek = ovladaci ?? cil;
  const stitek = prvek.closest('[data-mereni]')?.getAttribute('data-mereni') ?? '';
  return `${prvek.tagName.toLowerCase()}:${stitek.slice(0, 40)}`;
}

/**
 * Štítek z nápisu tlačítka bez jména. Jméno hráče je v nápisech vždy až za
 * dvojtečkou („NOMINOVAT: HONZA"), tak se nápis u dvojtečky usekne.
 */
export function stitekNapisu(napis: unknown): string | undefined {
  if (typeof napis !== 'string') return undefined;
  const s = napis.split(':')[0]!.trim().slice(0, 40);
  return s || undefined;
}

function sledovatTukani() {
  const kliky: Klik[] = [];
  let posledniRage = 0;
  let posledniMrtvy = 0;

  window.addEventListener('pointerdown', (e) => {
    const ted = Date.now();
    const novy = { cas: ted, x: e.clientX, y: e.clientY };
    const rage = jeRageKlik(kliky, novy);
    kliky.push(novy);
    while (kliky.length > 12) kliky.shift();

    if (rage && ted - posledniRage > 3000) {
      posledniRage = ted;
      zaznamenat('rage_klik', { detail: popisCile(e.target), hodnota: Math.round((e.clientX / window.innerWidth) * 100), hodnota2: Math.round((e.clientY / window.innerHeight) * 100) });
    }

    const ovladaci = e.target instanceof Element && e.target.closest('button, a, input, textarea, [role="button"]');
    if (!ovladaci && ted - posledniMrtvy > 2000) {
      posledniMrtvy = ted;
      zaznamenat('mrtvy_klik', { detail: popisCile(e.target), hodnota: Math.round((e.clientX / window.innerWidth) * 100), hodnota2: Math.round((e.clientY / window.innerHeight) * 100) });
    }
  }, { capture: true, passive: true });
}

// ---------------------------------------------------------------- chyby, viditelnost, start

let spusteno = false;

/** Zapne sběr. Volá se jednou při startu aplikace. */
export function spustitMereni() {
  if (spusteno || typeof window === 'undefined') return;
  spusteno = true;

  sledovatTukani();

  window.addEventListener('error', (e) => {
    zaznamenat('chyba_js', { detail: String(e.message ?? '').slice(0, 200), detail2: String(e.filename ?? '').split('/').pop()?.slice(0, 60) });
  });
  window.addEventListener('unhandledrejection', (e) => {
    const d = (e as PromiseRejectionEvent).reason;
    zaznamenat('chyba_js', { detail: String(d?.message ?? d ?? '').slice(0, 200), detail2: 'promise' });
  });

  // Telefon dolů během rozpravy je žádoucí; jinde je zmizení karty spíš výpadek.
  let skryto = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { skryto = Date.now(); zaznamenat('karta_skryta'); }
    else if (skryto) { zaznamenat('karta_zpet', { hodnota: Date.now() - skryto }); skryto = 0; }
  });
  window.addEventListener('pagehide', () => odeslat());

  const spojeni = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection?.effectiveType ?? '';
  zaznamenat('nacteni', {
    detail: `${window.innerWidth}x${window.innerHeight}`,
    detail2: `${navigator.language}${spojeni ? ' ' + spojeni : ''}`,
    hodnota: Math.round(performance.now()),
  });
}
