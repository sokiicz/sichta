# Plán stavby

Stav: 2026-09-20. Fáze 1 a 2 hotové. Zbývá playtest a nasazení.

Pořadí je zvolené tak, aby **hratelná věc existovala co nejdřív** a aby ta nejtěžší
část (herní logika) byla hotová a otestovaná dřív, než se k ní přidá síť.

---

## Fáze 1 · Jádro a lokální hra

Cílem je appka, kterou jde **odehrát celou na jednom telefonu** (hot seat),
bez Supabase a bez internetu. Zní to jako oklika, ale není: ověří to všechna
pravidla, všechny obrazovky a celý stavový automat dřív, než se do toho zamíchá
síť. Když pak něco nefunguje, víme, že chyba je v síti, ne v pravidlech.

| # | Co | Kdo | Stav |
|---|---|---|---|
| 1.1 | Vite + React + TypeScript, PWA, `base: '/sichta/'` | Claude | hotovo |
| 1.2 | `brand/tokens.css` zapojené, písma z Google Fonts | Claude | hotovo |
| 1.3 | `src/game/` — typy, pravidla, stavový automat, čistý reducer bez UI | Claude | hotovo |
| 1.4 | Testy nad reducerem a nad pohledem hráče | Claude | hotovo, 41 testů |
| 1.5 | Obrazovky jako komponenty nad tokeny | Claude | hotovo |
| 1.6 | Hot seat režim: jedno zařízení, předává se dokola | Claude | hotovo |
| 1.7 | Animace podle [obrazovky.md](obrazovky.md) §3 | Claude | hotovo |
| 1.8 | Haptika a zvuk z jednoho telefonu | Claude | hotovo |

**Výstup:** `npm run dev`, hra se dá odehrát od začátku do konce. Ověřeno
proklikáním celé partie v prohlížeči, včetně noci a vyhlášení vítěze.

---

## Fáze 2 · Síť na Cloudflare Durable Objects

Jedna DO instance na jednu místnost. Drží stav autoritativně, sama posouvá fáze
přes `alarm()` a každému telefonu posílá vlastní pohled.

**Klíčový důvod téhle volby:** `src/game/` je čistý TypeScript, takže uvnitř
Durable Objectu běží **ten samý reducer** jako v prohlížeči. Žádné duplikování
pravidel do SQL, žádné dvě pravdy, co se časem rozejdou.

| # | Co | Kdo | Stav |
|---|---|---|---|
| 2.1 | `worker/index.ts` — Worker a Durable Object | Claude | hotovo |
| 2.2 | `src/game/pohled.ts` — co smí vidět jeden hráč | Claude | hotovo, 8 testů |
| 2.3 | `wrangler.toml` se SQLite backendem | Claude | hotovo |
| 2.4 | **Účet na Cloudflare, `wrangler login`, `wrangler deploy`** | **uživatel** | hotovo |
| 2.5 | `src/net/` — WebSocket klient, reconnect přes token | Claude | hotovo |
| 2.6 | Přepínač `hot seat` / `online` na jednom místě | Claude | hotovo |
| 2.7 | Připojení odkazem `?k=KÓD` a sdílení ze šatny | Claude | hotovo |

Návod: [navod-cloudflare.md](navod-cloudflare.md).

V `supabase/` leží hotová alternativa pro Postgres. Je to slepá větev, nechávám
ji pro případ, že by Cloudflare z nějakého důvodu nevyhověl.

---

## Fáze 3 · Playtest a nasazení

| # | Co | Kdo |
|---|---|---|
| 3.1 | Odehrát to s partou, sledovat body z [obrazovky.md](obrazovky.md) §5 | uživatel |
| 3.2 | Doladit čísla v `design.md` §3.1 podle toho, co se stalo | Claude |
| 3.3 | Repo na GitHubu, nasazení na GH Pages | uživatel potvrdí, Claude připraví |

---

## Co budu potřebovat od tebe

Tyhle věci za tebe udělat nemůžu, protože chtějí tvůj účet nebo tvoje potvrzení.
Až na ně dojde, dostaneš podrobný návod krok za krokem.

1. ~~**Účet na Cloudflare**~~. Hotovo, worker běží.
2. **Repo na GitHubu** a nasazení na GH Pages. Podle pravidel workspace to
   nedělám bez tvého výslovného pokynu.
3. **Playtest.** Tohle je jediná část, kterou nenahradí nic.

---

## Co se vědomě nestaví

- **Účty a přihlašování.** Jméno a kód místnosti stačí.
- **Vzdálená hra.** Všichni jsou v jedné místnosti.
- **Chat v aplikaci.** Mluví se u stolu.
- **Minihry, banka, upgrady** (v2) a **tajný sabotér, imunita** (v3). Nejdřív
  musí obstát v1.
- **Řízená rozprava pro 13+ hráčů.** Viz `design.md`, hranice dvanácti.
