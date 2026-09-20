# Šichta

Hra na sociální dedukci pro partu u jednoho stolu. Každý má svůj telefon,
aplikace rozdá role, hlídá fáze a ukáže každému jen to, co smí vidět.
Vypravěče není potřeba.

Část party tajně kazí šichty. Pracanti je musí vyhostit dřív, než dojdou kola.
Padlá šichta je jediný tvrdý důkaz ve hře, ale zároveň odmění sabotéry.

5 až 12 hráčů, jeden večer, žádná registrace.

## Spuštění

```bash
npm install
npm run dev
```

Bez `.env.local` funguje jen režim na jednom telefonu. Pro hru po síti je
potřeba adresa Cloudflare workeru, viz [docs/navod-cloudflare.md](docs/navod-cloudflare.md).

## Jak je to poskládané

| Kde | Co |
|---|---|
| `src/game/` | pravidla jako čistý reducer, bez UI, pokryté testy; `opravneni.ts` říká, kdo smí co poslat |
| `src/ui/` | designový systém, primitiva vynucují pravidla značky |
| `src/screens/` | obrazovky, čistě prezentační |
| `src/net/` | WebSocket klient a přepínač lokální/online hry |
| `worker/` | Cloudflare Worker a Durable Object, jedna instance na místnost |
| `brand/` | tokeny a pravidla značky |
| `docs/` | návrh hry, soupis obrazovek, audity, úkoly, průzkum trhu, plán stavby |

Herní pravidla žijí **jen** v `src/game/`. Durable Object spouští ten samý
reducer jako prohlížeč, takže neexistují dvě pravdy, co by se mohly rozejít.
Klient nikdy nedostane celý stav, ven vede jediná cesta, `pohledPro()`,
a ta má vlastní testy na únik rolí i na to, co se smí ukázat kdy. Náhodu
místnosti a hodiny drží worker, reducer je nemá.

Hra na jednom telefonu je vývojová pomůcka, hraje se online.

## Nástroje

```bash
npm test                              # herní logika, 103 testů
npm run build                         # produkční build
npm run cf:dev                        # backend lokálně na :8787
npm run cf:deploy                     # nasazení workeru
npm run test:online -- https://sichta.sokiicz.workers.dev   # integrační test proti workeru
node docs/balance-sim.mjs --games 6000  # simulace vyvážení
```

Wrangler potřebuje Node 22+. V `D:/ai/tools/node22` leží přenosný Node,
`cf.cmd` si ho dá do PATH sám. Systémový Node zůstává nedotčený.

## Stav

Hratelné od začátku do konce po síti, po auditu a opravách z 2026-09-20.
Zbývá playtest s partou a nasazení opravené verze. Podrobně
v [docs/plan-stavby.md](docs/plan-stavby.md) a [docs/ukoly.md](docs/ukoly.md).

## Secrets

Adresa workeru je v `D:/ai/Apps/Secrets/sichta.txt`, lokálně v `.env.local`.
Do repa se nedostane ani jedno.
