# Stav projektu Šichta

**K 2026-10-04.** Předávka pro další session. Všechno níž je commitnuté a pushnuté na `origin/main`
(poslední commit `6752d23`) a nasazené na https://sichta.sokiicz.workers.dev (verze
`b87b1d1d-b131-43f0-a895-e9c23d5accbd`), kromě tohoto souboru.

## Co je hotové

- **Simulace s dvaceti personami** na skutečném reduceru: [simulace-persony.md](simulace-persony.md),
  nástroj v [persony/](persony/README.md). Kapitoly 14 až 16 přidávají dovednost, délku rozpravy
  a srovnání s Krvavkou ([simulace-krvavka.md](simulace-krvavka.md)).
- **Sestavy podle simulace** v `src/game/rules.ts`: tři úrovně stolu (začátečníci, smíšený, zkušení),
  pro každou limit šicht a násobek rozpravy, laděné na zhruba 48 % výher pracantů.
- **Knoflík na limit šicht** (−1 až +2) v nastavení, s odhadem výher a času. Reducer čistí vstup z sítě.
- **Testy:** 131 jednotkových (`npm test`), `test:online` (lokálně i živě prošel), nový `test:partie`
  (boti hrají celé partie na více stolech, proti živé adrese prošel na pěti stolech).
- **Node:** systémový je 22.23.2, `CLAUDE.md` je upravený.

## Co zbývá a co si pamatovat

1. **Playtest.** Čísla v `rules.ts` jsou z modelu person, ne z lidí. Po prvních partiích přeměřit výhru
   pracantů podle počtu hráčů, úrovně a posunu (`partie_start` má v `detail2` úroveň a posun,
   `partie_konec` vítěze) a limit doladit. SQL v `mereni.md` je náčrt, sloupce neověřené.
2. **Měření je zasažené testy.** Živé běhy `test:online` a `test:partie` z 2026-10-03 zapsaly do Analytics
   Engine asi osm partií a několik místností. Při vyhodnocení je vynechat (odpoledne 2026-10-03).
3. **Hrubé buňky v tabulce sestav:** osm hráčů (50 až 56 %) a šest smíšených (55 %), mezi dvěma celými koly
   nic jemnějšího není. U sedmi a osmi vyšel čas 25 až 28 minut, ne o deset víc.
4. **Poslední slovo** může při rozptýlených nominacích trvat přes dvě minuty (až šest kandidátů po 20 s).
   Zatím neměněno, sledovat na playtestu.
5. **Neověřeno:** vzhled obrazovky nastavení očima (screenshot v okně nešel, jen DOM a rozměry), chování
   rozehraných místnosti ze staré verze s uloženým `nastaveni` bez nových polí (kód to ošetřuje
   výchozími hodnotami, v praxi nezkoušeno).
6. **`DOPORUCENY` v `scripts/test-partie.mjs`** je opsané z `rules.ts`. Po změně sestav opsat.
7. **`AGENTS.md`** v kořeni je untracked a není z téhle práce, nechávám ho být.

## Kam sáhnout

| Co | Kde |
|---|---|
| Sestavy, limity, odhady | `src/game/rules.ts` (`LADENI`, `ODHAD`) |
| Přeměření a nový `ODHAD` | `npx vite-node docs/persony/spust.ts odhad --uroven <úroveň> --games 4000` |
| Obrazovka nastavení | `src/screens/nastaveni.tsx` |
| Test celých partií | `npm run test:partie -- <adresa> [--stoly 5:smiseny:0]` |
| Nasazení | `npm run build`, pak `npx wrangler deploy` (nebo `cf.cmd`), jen po potvrzení uživatele |

## Doplněk ze session pravidel a průvodce (2026-10-04 večer)

- **Průvodce a pravidla v appce sledují úrovně stolu.** Tabulka v `docs/jak-hrat.md` §10 byla ještě
  z doby jednoho limitu na počet hráčů, teď má sloupce začátečníci, smíšený, zkušení (opsané
  z `LADENI` v `rules.ts`). V appce obrazovka Pravidla počítá sestavy ze `sestavaPro(n)` pro
  smíšený stůl a říká to v textu karty. Při změně `LADENI` opsat §10 ručně, appka se přepočítá sama.
- **Otevřená otázka z chatu:** uživatel se ptal, jestli je reálné, aby sabotéři vybili všechny
  pracanty, a jestli nemá platit parita. Odpověď je v `design.md` §3.7 (parita zamítnuta simulací)
  a v číslech ze `scratch/limity-8.mjs`: u sedmi hráčů končí vybitím stolu třetina partií, u devíti
  přes polovinu. Jeho pochybnost o limitu 3 u osmi hráčů vyřešil commit `703a187` (osm hráčů má
  teď čtyři šichty na všech úrovních).
- **Nepushnuto:** jen tenhle commit s úpravou průvodce a stavu. `AGENTS.md` v kořeni zůstává untracked.
