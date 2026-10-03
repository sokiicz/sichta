# Simulace s personami

Dvacet vymyšlených hráčů a stoly z nich, odehrané **skutečným reducerem** hry.
Výsledky a jejich výklad jsou v [../simulace-persony.md](../simulace-persony.md).
Tohle je popis nástroje.

## Spuštění

```bash
npx vite-node docs/persony/spust.ts <pokus> [--games N] [--seed N]
```

`vite-node` je v `node_modules`, na Node 20 běží. Pokusy:

| Pokus | Co dělá | Doporučeně `--games` |
|---|---|---|
| `kalibrace` | stůl dokonalých botů proti starému `balance-sim.mjs` | 3000 |
| `zaklad` | náhodné persony, 5 až 12 hráčů | 4000 |
| `scenare` | 10 typů stolů (rodina, firma, večírek…) × jejich velikosti | 2500 |
| `persony` | per-persona statistiky jako pracant a jako sabotér | 6000 |
| `dvojice` | všech 190 dvojic sabotérů při 8 hráčích | 2000 (na dvojici čtvrtina) |
| `citlivost` | co se stane, když se posune každá konstanta modelu | 2500 |
| `vecer` | pět partií po sobě, stůl se učí | 3000 |
| `nastaveni` | vypnuté vraždy, špionská varianta | 3000 |

Tabulky se tisknou a ukládají do `vysledky/`. Stejný `--seed` dá stejná čísla.
**Každý běh přepíše svůj soubor ve `vysledky/`, i zkušební s malým `--games`.**
Soubory ve `vysledky/` jsou ostré běhy se čísly z doporučených `--games`, ze kterých vychází
[../simulace-persony.md](../simulace-persony.md).
Rychlost je kolem 1,5 ms na partii, `dvojice` a `citlivost` jsou nejdelší.

## Soubory

- `persony.ts`: dvacet person (rysy 0 až 1), robot pro kalibraci a scénáře stolů.
- `mysl.ts`: mysl jednoho hráče, váhy nad všemi možnými množinami sabotérů.
- `hra.ts`: ovladač partie. Volá `reducer` a `pohledPro` z `src/game/`, rozhodování hráčů je model.
- `spust.ts`: pokusy a tabulky.

## Co je skutečné a co model

**Skutečné** (kód ze `src/game/`, nic se tu neduplikuje): rozdání rolí, losování part,
výsledek šichty, věty šeptandy, nominace, kandidáti, kvórum rady, hlasy stínů,
odměny, vražda, imunita, tma, limit, konec. Hráči se dívají jen na to, co by
viděli na telefonu: `pohledPro()`, a věty šeptandy dostávají z `septanda.ts`.

**Model** (`hra.ts`): jak lidé rozhodují. Každý hráč má vlastní mysl nad všemi
možnými množinami sabotérů. Stopy zpracovává podle rysů: `analytika` říká, kolik
z důkazu využije, `pamet`, kolik z historie si vybaví, `sum` je šum intuice.
Rozprava je model sbližování názorů: mluví ti, kdo mají hlas, a každý se
přibližuje k váženému průměru toho, co zaznělo (váha = hlasitost mluvčího krát
důvěra posluchače, ochota = sugestibilita). Lež se pozná podle čtení lidí
(`detekce` proti `lhani`), nebo když odporuje veřejně známé roli.

Konstanty modelu, které nejsou rysem žádného hráče, jsou v `Parametry` v
`hra.ts` a pokus `citlivost` je posouvá. **Absolutní čísla jsou odhad, srovnání
mezi stoly a sestavami je spolehlivější.** Ověří je teprve playtest.

## Jak přidat personu nebo stůl

Persona je objekt s dvaceti rysy v `persony.ts`. Stejně tak scénář: váhy person,
velikosti stolu, počet párů kamarádů a případná úprava rysů pro celý stůl
(alkohol, první hra). Rysy mají komentář, co znamenají.

## Co se nemodeluje

Odpojení a pauzy, hlasitost a přerušování v rozpravě, to, že se lidé znají
z minulých partií a vědí, kdo jak lže, a výkyvy nálady během večera. Stoly nad
12 hráčů.
