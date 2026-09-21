# Plán stavby

Stav: 2026-09-20 večer. Fáze 1 a 2 hotové, fáze 2b (audit a opravy) hotová.
Zbývá playtest a doladění čísel.

Pořadí je zvolené tak, aby **hratelná věc existovala co nejdřív** a aby ta nejtěžší
část (herní logika) byla hotová a otestovaná dřív, než se k ní přidá síť.

---

## Fáze 1 · Jádro a lokální hra

Cílem byla appka, kterou jde **odehrát celou na jednom telefonu** (hot seat),
bez sítě. Ověřilo to všechna pravidla, všechny obrazovky a celý stavový automat
dřív, než se do toho zamíchala síť. Hot seat zůstává jako vývojová pomůcka
a nouzovka, ne jako herní režim: nehlídá čas a předává se ručně.

| # | Co | Kdo | Stav |
|---|---|---|---|
| 1.1 | Vite + React + TypeScript, PWA | Claude | hotovo |
| 1.2 | `brand/tokens.css` zapojené, písma z Google Fonts | Claude | hotovo |
| 1.3 | `src/game/` — typy, pravidla, stavový automat, čistý reducer bez UI | Claude | hotovo |
| 1.4 | Testy nad reducerem a nad pohledem hráče | Claude | hotovo, 112 testů |
| 1.5 | Obrazovky jako komponenty nad tokeny | Claude | hotovo |
| 1.6 | Hot seat režim: jedno zařízení, předává se dokola | Claude | hotovo |
| 1.7 | Animace podle [obrazovky.md](obrazovky.md) §3 | Claude | hotovo |
| 1.8 | Haptika a zvuk z jednoho telefonu | Claude | hotovo |

---

## Fáze 2 · Síť na Cloudflare Durable Objects

Jedna DO instance na jednu místnost. Drží stav autoritativně, sama posouvá fáze
přes `alarm()` a každému telefonu posílá vlastní pohled.

**Klíčový důvod téhle volby:** `src/game/` je čistý TypeScript, takže uvnitř
Durable Objectu běží **ten samý reducer** jako v prohlížeči. Žádné duplikování
pravidel, žádné dvě pravdy, co se časem rozejdou.

| # | Co | Kdo | Stav |
|---|---|---|---|
| 2.1 | `worker/index.ts` — Worker a Durable Object | Claude | hotovo |
| 2.2 | `src/game/pohled.ts` — co smí vidět jeden hráč | Claude | hotovo |
| 2.3 | `wrangler.toml` se SQLite backendem, appka ze stejného workeru | Claude | hotovo |
| 2.4 | **Účet na Cloudflare, `wrangler login`, `wrangler deploy`** | **uživatel** | hotovo |
| 2.5 | `src/net/` — WebSocket klient, reconnect přes token | Claude | hotovo |
| 2.6 | Přepínač `hot seat` / `online` na jednom místě | Claude | hotovo |
| 2.7 | Připojení odkazem `?k=KÓD` a sdílení ze šatny | Claude | hotovo |

Návod: [navod-cloudflare.md](navod-cloudflare.md).

---

## Fáze 2b · Audit a opravy (2026-09-20)

Před playtestem prošla celá aplikace auditem ([audit-aplikace.md](audit-aplikace.md))
a podle něj se opravilo všechno, co zasahovalo do hry. Seznam úkolů s odkazy na
nálezy je v [ukoly.md](ukoly.md). To podstatné:

| Co | Stav |
|---|---|
| Náhoda místnosti: seed drží worker, role nezávisí na pořadí příchodu | hotovo |
| Imunita a tma působí v nejbližší radě, imunita má cíl a ráno je veřejná | hotovo |
| Nástupnictví předáka, návrhy oběti vidí předák u jmen | hotovo |
| Kdo smí co poslat (`opravneni.ts`), fáze posouvá jen server | hotovo |
| Odpočet z času serveru, pauza jen v akčních fázích, návrat od stejné vteřiny, wake lock | hotovo |
| Fáze končí dřív, když odevzdali všichni | hotovo |
| Dvě směny vypnuté, sestavy přeměřené na jednu směnu | hotovo |
| Kvórum v radě, hlas stínu utracený použitím, šeptanda bez důkazů | hotovo |
| Přehled historie a připomínka role, čekání na noc, znovu se stejnou partou | hotovo |
| Šatna: jedinečné přezdívky, odpojení nezačnou, zakladatel může vyhodit | hotovo |
| Pořadí předávání telefonu v hot seatu podle sedadel | hotovo |
| Integrační test proti workeru (`scripts/test-online.mjs`) | hotovo |
| Dokumentace srovnaná s kódem, Supabase větev smazaná | hotovo |

---

## Fáze 3 · Playtest a doladění

| # | Co | Kdo |
|---|---|---|
| 3.1 | Odehrát to online s partou, sledovat body z [design.md](design.md) §10 | uživatel |
| 3.2 | Nasadit workera (`npm run cf:deploy`), aby živá adresa běžela s opravami | uživatel potvrdí |
| 3.3 | Doladit čísla v `src/game/rules.ts` podle toho, co se stalo | Claude |
| 3.4 | Protokol partie (export průběhu z telefonu zakladatele), bez něj se čísla nemají z čeho ladit | Claude |

---

## Co se vědomě nestaví

- **Účty a přihlašování.** Jméno a kód místnosti stačí.
- **Vzdálená hra.** Všichni jsou v jedné místnosti.
- **Chat v aplikaci.** Mluví se u stolu.
- **Stolní obrazovka na televizi.** Zatím ne, telefony stačí.
- **Minihry, banka, upgrady** (v2) a **tajný sabotér, stín na šichtě, dvojitá
  vražda** (v3). Nejdřív musí obstát v1. Co z toho vůbec stavět, říká
  [audit-aplikace.md](audit-aplikace.md) §7.
- **Řízená rozprava pro 13+ hráčů.** Viz `design.md`, hranice dvanácti.
