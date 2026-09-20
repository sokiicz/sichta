# sichta

Stack: Vite + React + TS, PWA, Cloudflare Durable Objects. Project-specific quirks ONLY —
root rules at `D:/ai/CLAUDE.md`.

## Kde co je
- `docs/design.md` — pravidla hry. **Zdroj pravdy.** Čísla v §3.1 jsou
  výsledek simulace, ne odhad. Neměnit od oka.
- `docs/obrazovky.md` — soupis 34 obrazovek, animace, rozpočet načítání
- `docs/plan-stavby.md` — co je hotové a co zbývá
- `docs/navod-cloudflare.md` — kroky, které musí udělat uživatel
- `docs/navod-supabase.md` — slepá větev pro Postgres
- `brand/tokens.css` — **zdroj pravdy pro barvy.** Ne mockupy.
- `brand/README.md` — pravidla značky a tón textů
- `src/game/` — čistá herní logika bez UI, pokrytá testy
- `src/ui/` — designový systém, primitiva vynucují pravidla značky
- `src/screens/` — obrazovky, čistě prezentační
- `worker/` — Cloudflare Worker a Durable Object (jedna instance na místnost)
- `supabase/*.sql` — slepá větev, alternativa pro Postgres

Návrhy obrazovek: https://claude.ai/artifact/RDaLmTWuJK8vqX4SbT2MrV

## Pravidla, na která se snadno zapomene
- **Nikdy em-dash** v českých textech. Tečka, dvojtečka, čárka.
- **Rez je značka, ne role.** Nikdy neoznačuje sabotéra.
- **Obě role vidí tutéž obrazovku.** MAKAT i KAZIT vypadají vždy stejně,
  i když pracant kazit nemůže. Zašedlé tlačítko by roli prozradilo přes stůl.
- **Rodová shoda:** jména hráčů jsou mužská i ženská. Žádná příčestí
  v UI textech („odevzdal", „vyhoštěna"). Používat podstatná jména.
- Klient nikdy nedostane celý stav. Jediná cesta ven je `pohledPro()`
  v `src/game/pohled.ts`, a ta má vlastní testy na únik rolí.
- **Herní pravidla žijí jen v `src/game/`.** Běží stejná na klientovi
  i v Durable Objectu. Nikdy je needuplikovat jinam.
- **Vedlejší efekty nepatří do state updateru.** React je ve StrictMode pouští
  dvakrát; jednou už to přeskočilo celou fázi.
- **Abeceda kódu místnosti je v `src/game/kod.ts`.** Klávesnice v šatně i
  generátor ve workeru čtou z ní. Jednou se rozešly a kód `B7Z4P6` se nedal
  naťukat, protože mřížka měla jen A až J.
- **Zvuk nesmí prozradit roli.** `src/ui/zvuk.ts` se řídí jen veřejnými údaji
  z pohledu. Nahlas hraje jeden telefon: hot seat vždy, online zakladatel.

## Node
Systémový Node je 20.15.1, wrangler chce 22+. V `D:/ai/tools/node22` leží
přenosný Node 22.23.2 a `cf.cmd` si ho sám dá do PATH. Systémový Node zůstal
netknutý, ostatní projekty o tomhle nevědí. **Nepouštěj `npx wrangler` přímo**,
vždycky přes `npm run cf:*`.

## Nástroje
- `npm test` — testy herní logiky (41 testů, hraje 32 celých partií)
- `node docs/balance-sim.mjs --games 6000` — simulace vyvážení
- `node docs/balance-sim.mjs --scale` — chování nad 12 hráčů
- `node docs/audit-obrazovek.mjs` — statický audit návrhů obrazovek
- `npm run cf:dev` — backend lokálně na :8787
- `npm run cf:deploy` — nasazení workeru
- `npx tsc -p worker/tsconfig.json --noEmit` — typy workeru
