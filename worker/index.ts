/**
 * Šichta na Cloudflare. Jedna Durable Object instance na jednu místnost.
 *
 * Proč zrovna takhle: DO je jediný autoritativní držitel stavu, takže nemůže
 * nastat, že si dva telefony spočítají kolo jinak. A protože herní pravidla
 * žijí v src/game jako čistý TypeScript, běží tady stejný reducer jako
 * v prohlížeči. Žádné duplikování pravidel do SQL.
 */

import { prazdnyStav, reducer, zivi } from '../src/game/machine';
import { delkaFaze } from '../src/game/rules';
import { pohledPro } from '../src/game/pohled';
import { ABECEDA_KODU, DELKA_KODU } from '../src/game/kod';
import type { Akce, HracId, Stav } from '../src/game/types';

export interface Env {
  MISTNOST: DurableObjectNamespace;
  /** Postavená appka. Wrangler ji bere z ./dist podle wrangler.toml. */
  SOUBORY: { fetch: (req: Request) => Promise<Response> };
}

/** Abeceda je v src/game/kod.ts, aby se nerozešla s klávesnicí v aplikaci. */
function novyKod(): string {
  let k = '';
  const b = new Uint8Array(DELKA_KODU);
  crypto.getRandomValues(b);
  for (const x of b) k += ABECEDA_KODU[x % ABECEDA_KODU.length];
  return k;
}

/**
 * Hra běží z GitHub Pages a z localhostu, worker je jinde, takže bez CORS
 * prohlížeč fetch zabije. WebSocket pod CORS nespadá, ale zakládání místnosti ano.
 *
 * Hvězdička je tu v pořádku: není co ukrást. Žádné cookies, žádné přihlášení,
 * token si klient nosí v URL a platí jen pro jednu místnost.
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

export class Mistnost {
  private stav: Stav = prazdnyStav();
  /** token → hráč. Návrat po výpadku se pozná podle tokenu, ne podle IP. */
  private tokeny = new Map<string, HracId>();

  constructor(private ctx: DurableObjectState, _env: Env) {
    this.ctx.blockConcurrencyWhile(async () => {
      this.stav = (await this.ctx.storage.get<Stav>('stav')) ?? prazdnyStav();
      this.tokeny = new Map((await this.ctx.storage.get<[string, HracId][]>('tokeny')) ?? []);
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
    if (!hracId && jmeno && this.stav.faze === 'satna') {
      hracId = `h${this.stav.hraci.length}`;
      this.stav = reducer(this.stav, { typ: 'PRIDAT_HRACE', id: hracId, jmeno });
      this.tokeny.set(token, hracId);
      await this.ulozit();
    }
    if (hracId) {
      this.stav = reducer(this.stav, { typ: 'PRIPOJIL_SE', id: hracId });
      await this.ulozit();
    }

    server.serializeAttachment({ token, hracId } satisfies Sezeni);
    this.rozeslat();

    return new Response(null, { status: 101, webSocket: klient });
  }

  async webSocketMessage(ws: WebSocket, zprava: string | ArrayBuffer) {
    if (typeof zprava !== 'string') return;
    const s = ws.deserializeAttachment() as Sezeni | null;
    if (!s?.hracId) return;

    let data: { t?: string; a?: Akce };
    try { data = JSON.parse(zprava); } catch { return; }
    if (data.t !== 'akce' || !data.a) return;

    // Klient smí posílat jen akce sám za sebe. Cizí id se zahodí.
    const a = data.a;
    if ('id' in a && a.id !== s.hracId) return;

    this.stav = reducer(this.stav, a);
    await this.ulozit();
    await this.naplanovatPosun();
    this.rozeslat();
  }

  async webSocketClose(ws: WebSocket) {
    const s = ws.deserializeAttachment() as Sezeni | null;
    if (!s?.hracId) return;
    // krátký výpadek není odpojení, počkáme, než hru zastavíme
    setTimeout(() => {
      if (this.jePripojeny(s.hracId!)) return;
      this.stav = reducer(this.stav, { typ: 'ODPOJIL_SE', id: s.hracId! });
      void this.ulozit();
      this.rozeslat();
    }, 8000);
  }

  /** Fáze posouvá server, ne klient. Deset telefonů se nemůže rozejít. */
  async alarm() {
    if (this.stav.pauza) return;
    this.stav = reducer(this.stav, { typ: 'DALSI_FAZE' });
    await this.ulozit();
    await this.naplanovatPosun();
    this.rozeslat();
  }

  // ---------------------------------------------------------------- vnitřek

  private jePripojeny(id: HracId): boolean {
    return this.ctx.getWebSockets().some((w) => {
      const s = w.deserializeAttachment() as Sezeni | null;
      return s?.hracId === id;
    });
  }

  private async ulozit() {
    await this.ctx.storage.put('stav', this.stav);
    await this.ctx.storage.put('tokeny', [...this.tokeny.entries()]);
  }

  private async naplanovatPosun() {
    const delka = delkaFaze(this.stav.faze, zivi(this.stav).length);
    if (delka <= 0 || this.stav.pauza) {
      await this.ctx.storage.deleteAlarm();
      return;
    }
    await this.ctx.storage.setAlarm(Date.now() + delka * 1000);
  }

  /** Každý telefon dostane vlastní pohled. Cizí role se ven nedostane nikdy. */
  private rozeslat() {
    for (const ws of this.ctx.getWebSockets()) {
      const s = ws.deserializeAttachment() as Sezeni | null;
      if (!s?.hracId) continue;
      try {
        ws.send(JSON.stringify({ t: 'pohled', p: pohledPro(this.stav, s.hracId) }));
      } catch {
        // zavřené spojení, další broadcast už ho nenajde
      }
    }
  }
}
