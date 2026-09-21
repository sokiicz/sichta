/**
 * Šichta na Cloudflare. Jedna Durable Object instance na jednu místnost.
 *
 * Proč zrovna takhle: DO je jediný autoritativní držitel stavu, takže nemůže
 * nastat, že si dva telefony spočítají kolo jinak. A protože herní pravidla
 * žijí v src/game jako čistý TypeScript, běží tady stejný reducer jako
 * v prohlížeči. Žádné duplikování pravidel do SQL.
 *
 * Co tu je navíc oproti reduceru a co reducer schválně neumí:
 * - náhoda místnosti (`seed`), která nikdy neopustí server,
 * - kdo smí kterou akci poslat (`smiPoslat`),
 * - hodiny: kdy fáze končí, jak dlouho stojí pauza, kdy se uklidí místnost.
 */

import { fazeHotova, prazdnyStav, reducer, zivi } from '../src/game/machine';
import { delkaFaze, MAX_HRACU } from '../src/game/rules';
import { pohledPro } from '../src/game/pohled';
import { smiPoslat } from '../src/game/opravneni';
import { ABECEDA_KODU, DELKA_KODU } from '../src/game/kod';
import type { Akce, HracId, Stav } from '../src/game/types';

export interface Env {
  MISTNOST: DurableObjectNamespace;
  /** Postavená appka. Wrangler ji bere z ./dist podle wrangler.toml. */
  SOUBORY: { fetch: (req: Request) => Promise<Response> };
}

/** Krátký výpadek není odpojení. Tolik ms se čeká, než hru zastavíme. */
const ODKLAD_ODPOJENI = 8000;
/** Když odevzdali všichni, fáze skončí za tolik ms, ať ještě doběhnou animace. */
const REZERVA_PO_ODEVZDANI = 1500;
/**
 * Noc končí s větším odstupem. Kdyby ráno přišlo hned po posledním odevzdání,
 * stůl by poznal, kdo byl poslední, a poslední bývá předák.
 */
const REZERVA_PO_NOCI = 8000;
/** Dohraná místnost se smaže po šesti hodinách, prázdná šatna po dni. */
const UKLID_PO_KONCI = 6 * 60 * 60 * 1000;
const UKLID_SATNY = 24 * 60 * 60 * 1000;

/** Abeceda je v src/game/kod.ts, aby se nerozešla s klávesnicí v aplikaci. */
function novyKod(): string {
  let k = '';
  const b = new Uint8Array(DELKA_KODU);
  crypto.getRandomValues(b);
  for (const x of b) k += ABECEDA_KODU[x % ABECEDA_KODU.length];
  return k;
}

function nahodnySeed(): number {
  const b = new Uint32Array(1);
  crypto.getRandomValues(b);
  return b[0] || 1;
}

/**
 * Appku servíruje ten samý worker, takže CORS v provozu nevzniká. Hlavičky
 * tu zůstávají kvůli vývoji, kde Vite běží na jiném portu. Hvězdička je
 * v pořádku: žádné cookies, žádné přihlášení, token si klient nosí sám.
 */
const CORS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...CORS },
  });

// ---------------------------------------------------------------- worker

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    if (url.pathname === '/api/mistnost' && req.method === 'POST') {
      const kod = novyKod();
      return json({ kod });
    }

    const m = url.pathname.match(new RegExp(`^/api/mistnost/([${ABECEDA_KODU}]{${DELKA_KODU}})(/.*)?$`));
    if (m) {
      const id = env.MISTNOST.idFromName(m[1]!);
      return env.MISTNOST.get(id).fetch(req);
    }

    // Co není API, je appka. Neznámá cesta dostane index.html, protože
    // hra je jednostránková a adresu si přepisuje sama.
    if (url.pathname.startsWith('/api/')) {
      return new Response('Tady nic není.', { status: 404, headers: CORS });
    }
    return env.SOUBORY.fetch(new Request(new URL('/index.html', url), req));
  },
};

// ---------------------------------------------------------------- místnost

interface Sezeni {
  token: string;
  hracId: HracId | null;
}

/** Proč se nešlo připojit. Klient to ukáže a přestane to zkoušet. */
export type ChybaPripojeni = 'hra-bezi' | 'plno' | 'jmeno';

type AlarmTyp = 'faze' | 'uklid' | null;

export class Mistnost {
  private stav: Stav = prazdnyStav();
  /** token → hráč. Návrat po výpadku se pozná podle tokenu, ne podle IP. */
  private tokeny = new Map<string, HracId>();
  /** Náhoda místnosti. Losuje se tady a nikdy neodchází ven. */
  private seed = 0;
  /** Id hráčů jdou z počítadla, ne z délky soupisky: kdo odejde, uvolní jméno, ne id. */
  private dalsiId = 1;
  private alarmTyp: AlarmTyp = null;

  constructor(private ctx: DurableObjectState, _env: Env) {
    this.ctx.blockConcurrencyWhile(async () => {
      this.stav = (await this.ctx.storage.get<Stav>('stav')) ?? prazdnyStav();
      this.tokeny = new Map((await this.ctx.storage.get<[string, HracId][]>('tokeny')) ?? []);
      this.seed = (await this.ctx.storage.get<number>('seed')) ?? 0;
      this.dalsiId = (await this.ctx.storage.get<number>('dalsiId')) ?? 1;
      this.alarmTyp = (await this.ctx.storage.get<AlarmTyp>('alarmTyp')) ?? null;
      if (!this.seed) {
        this.seed = nahodnySeed();
        await this.ulozit();
      }
    });
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    if (req.headers.get('Upgrade') !== 'websocket') {
      return json({ faze: this.stav.faze, hracu: this.stav.hraci.length });
    }

    const token = url.searchParams.get('token');
    const jmeno = (url.searchParams.get('jmeno') ?? '').trim().slice(0, 12);
    if (!token) return new Response('Chybí token.', { status: 400, headers: CORS });

    const pár = new WebSocketPair();
    const [klient, server] = [pár[0], pár[1]];

    // hibernace: spojení přežije uspání objektu a nestojí nic, když se mlčí
    this.ctx.acceptWebSocket(server, [token]);

    let hracId = this.tokeny.get(token) ?? null;
    // Vyhozený nebo hráč z partie, která už skončila a začala znovu: je to nový příchozí.
    if (hracId && !this.stav.hraci.some((h) => h.id === hracId)) hracId = null;

    let chyba: ChybaPripojeni | null = null;
    if (!hracId) {
      if (this.stav.faze !== 'satna') chyba = 'hra-bezi';
      else if (this.stav.hraci.length >= MAX_HRACU) chyba = 'plno';
      else if (!jmeno) chyba = 'jmeno';
      else {
        hracId = `h${this.dalsiId++}`;
        const pred = this.stav;
        this.stav = reducer(this.stav, { typ: 'PRIDAT_HRACE', id: hracId, jmeno }, this.seed);
        this.tokeny.set(token, hracId);
        await this.poAkci(pred);
      }
    } else {
      const pred = this.stav;
      this.stav = reducer(this.stav, { typ: 'PRIPOJIL_SE', id: hracId }, this.seed);
      await this.poAkci(pred);
    }

    server.serializeAttachment({ token, hracId } satisfies Sezeni);

    if (chyba) {
      server.send(JSON.stringify({ t: 'chyba', kod: chyba }));
      server.close(4000, chyba);
      return new Response(null, { status: 101, webSocket: klient });
    }

    this.rozeslat();
    return new Response(null, { status: 101, webSocket: klient });
  }

  async webSocketMessage(ws: WebSocket, zprava: string | ArrayBuffer) {
    if (typeof zprava !== 'string') return;
    const s = ws.deserializeAttachment() as Sezeni | null;
    if (!s?.hracId) return;

    let data: { t?: string; a?: Akce };
    try { data = JSON.parse(zprava); } catch { return; }
    if (data.t !== 'akce' || !data.a || typeof data.a !== 'object') return;

    let a = data.a;
    // Náhodu si klient nevybírá. Start dostane vlastní seed i identifikátor partie.
    if (a.typ === 'ZACIT') {
      this.seed = nahodnySeed();
      a = { typ: 'ZACIT', partie: crypto.randomUUID() };
    }
    if (!smiPoslat(this.stav, a, s.hracId)) return;

    const pred = this.stav;
    this.stav = reducer(this.stav, a, this.seed);
    await this.poAkci(pred);
    this.rozeslat();
  }

  async webSocketClose(ws: WebSocket) {
    const s = ws.deserializeAttachment() as Sezeni | null;
    if (!s?.hracId) return;
    // krátký výpadek není odpojení, počkáme, než hru zastavíme
    setTimeout(() => {
      if (this.jePripojeny(s.hracId!)) return;
      const pred = this.stav;
      this.stav = reducer(this.stav, { typ: 'ODPOJIL_SE', id: s.hracId! }, this.seed);
      void this.poAkci(pred).then(() => this.rozeslat());
    }, ODKLAD_ODPOJENI);
  }

  /** Fáze posouvá server, ne klient. Deset telefonů se nemůže rozejít. */
  async alarm() {
    if (this.alarmTyp === 'uklid') {
      await this.ctx.storage.deleteAll();
      return;
    }
    if (this.stav.pauza) return;
    const pred = this.stav;
    this.stav = reducer(this.stav, { typ: 'DALSI_FAZE' }, this.seed);
    await this.poAkci(pred);
    this.rozeslat();
  }

  // ---------------------------------------------------------------- hodiny

  /** Co se považuje za "jinou fázi" pro účely odpočtu. */
  private klicFaze(s: Stav): string {
    return `${s.faze}|${s.kolo}|${s.aktualni?.smeny.length ?? 0}|${s.aktualni?.mluvi ?? 0}`;
  }

  private plnaDelka(s: Stav): number {
    return delkaFaze(s.faze, zivi(s).length, s.aktualni?.kandidati.length ?? 2) * 1000;
  }

  /**
   * Po každé změně stavu se rozhodne, co s odpočtem. Tady, ne v reduceru,
   * protože reducer hodiny nemá a mít nemá.
   */
  private async poAkci(pred: Stav) {
    const ted = Date.now();
    const s = this.stav;

    if (s.faze === 'satna' || s.faze === 'konec') {
      this.stav = { ...s, konecFaze: null, pauza: null };
      await this.naplanovatUklid(s.faze === 'konec' ? UKLID_PO_KONCI : UKLID_SATNY);
      await this.ulozit();
      return;
    }

    const zmenaFaze = this.klicFaze(pred) !== this.klicFaze(s);

    if (s.pauza) {
      if (s.pauza.od == null) {
        // Pauza právě začala, nebo přešla na dalšího hráče. Zbývající čas
        // se zapamatuje a odpočet se zastaví.
        const zbyva = pred.pauza?.zbyva
          ?? (s.konecFaze != null ? Math.max(0, s.konecFaze - ted) : this.plnaDelka(s));
        this.stav = { ...s, pauza: { ...s.pauza, od: pred.pauza?.od ?? ted, zbyva }, konecFaze: null };
        await this.zrusitAlarm();
      }
      await this.ulozit();
      return;
    }

    if (zmenaFaze) {
      await this.naplanovat(this.plnaDelka(s));
    } else if (pred.pauza) {
      // pauza skončila, pokračuje se od vteřiny, kde se stálo
      await this.naplanovat(pred.pauza.zbyva ?? this.plnaDelka(s));
    } else if (fazeHotova(s)) {
      // odevzdali všichni, není na co čekat
      const rezerva = s.faze === 'noc' ? REZERVA_PO_NOCI : REZERVA_PO_ODEVZDANI;
      if (s.konecFaze == null || s.konecFaze - ted > rezerva) await this.naplanovat(rezerva);
    }
    await this.ulozit();
  }

  private async naplanovat(ms: number) {
    if (ms <= 0) {
      this.stav = { ...this.stav, konecFaze: null };
      await this.zrusitAlarm();
      return;
    }
    const konec = Date.now() + ms;
    this.stav = { ...this.stav, konecFaze: konec };
    this.alarmTyp = 'faze';
    await this.ctx.storage.setAlarm(konec);
  }

  private async naplanovatUklid(ms: number) {
    this.alarmTyp = 'uklid';
    await this.ctx.storage.setAlarm(Date.now() + ms);
  }

  private async zrusitAlarm() {
    this.alarmTyp = null;
    await this.ctx.storage.deleteAlarm();
  }

  // ---------------------------------------------------------------- vnitřek

  private jePripojeny(id: HracId): boolean {
    return this.ctx.getWebSockets().some((w) => {
      const s = w.deserializeAttachment() as Sezeni | null;
      return s?.hracId === id && w.readyState === WebSocket.READY_STATE_OPEN;
    });
  }

  private async ulozit() {
    await this.ctx.storage.put({
      stav: this.stav,
      tokeny: [...this.tokeny.entries()],
      seed: this.seed,
      dalsiId: this.dalsiId,
      alarmTyp: this.alarmTyp,
    });
  }

  /** Každý telefon dostane vlastní pohled a čas serveru, ať si srovná hodiny. */
  private rozeslat() {
    const ted = Date.now();
    for (const ws of this.ctx.getWebSockets()) {
      const s = ws.deserializeAttachment() as Sezeni | null;
      if (!s?.hracId) continue;
      try {
        ws.send(JSON.stringify({ t: 'pohled', p: pohledPro(this.stav, s.hracId), ted }));
      } catch {
        // zavřené spojení, další broadcast už ho nenajde
      }
    }
  }
}
