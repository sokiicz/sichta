# Měření chování

Stav: 2026-09-21. Bez cookies, bez třetích stran, bez osobních údajů.

## Co to je

Každá herní i uživatelská událost se zapíše do **Workers Analytics Engine**
na Cloudflaru (dataset `sichta_udalosti`, vazba `ANALYTIKA` ve `wrangler.toml`).
Herní události zapisuje worker sám, protože je vidí první. Události z telefonu
(obrazovky, ťukání, chyby, výpadky) posílá `src/ui/telemetrie.ts` dávkou na
`POST /api/udalost`, worker je zkontroluje a zapíše.

Analytics Engine je na Workers Free zdarma s denním limitem zápisů; jedna
partie vyrobí řádově stovky událostí, takže je to hluboko pod ním. Data se drží
90 dní.

## Co se ukládá a co ne

Ukládá se: kód místnosti, id hráče v místnosti (`h1`, `h2`...), náhodné id
načtení stránky, prvních osm znaků herního tokenu jako id telefonu, zařízení
(`ios/pwa`, `android/web`, `pocitac/web`), jazyk, typ připojení, rozměr okna,
verze buildu, fáze a kolo, název události a dva krátké texty k ní.

Neukládá se: přezdívky, role, tajné volby (kdo kazil, kdo koho nominoval),
šeptanda, IP adresa, cookies. Analytics Engine nezná ani IP: worker ji nepředává.

Ťuknutí se popisuje jen značkou a štítkem `data-mereni` (`button:NOMINOVAT`),
nikdy textem ani `aria-label`, protože ty nesou přezdívky („Vyhodit Honza").
Primitiva `Tlacitko` a `Volba` si štítek dělají samy: nápis tlačítka se usekne
u dvojtečky, za kterou v nápisech vždy stojí jméno („NOMINOVAT: HONZA"), volba
posílá jen `popis` nebo obecné `volba`. Surové `<button>` mají štítek ručně.

Id telefonu existuje jen proto, aby šlo poznat, že se stejný telefon vrátil
na další partii. Vypnout ho jde jedním řádkem: v `src/ui/telemetrie.ts`
nastavit `ZARIZENI` na `null`.

## Sloupce

Pořadí je pevné. Kdo ho změní ve `worker/index.ts` (`zapsatUdalost`), musí
změnit i dotazy níž.

| Sloupec | Co |
|---|---|
| `index1` | kód místnosti, nebo `bez` (úvod, hot seat) |
| `blob1` | typ události |
| `blob2` | `server` nebo `klient` |
| `blob3` | režim: `online`, `hotseat` |
| `blob4` | fáze (u obrazovek krok aplikace) |
| `blob5` | detail |
| `blob6` | detail2 |
| `blob7` | id hráče v místnosti |
| `blob8` | id načtení stránky |
| `blob9` | id telefonu |
| `blob10` | zařízení |
| `blob11` | verze buildu |
| `double1` | počet hráčů |
| `double2` | kolo |
| `double3` | hodnota (typicky ms) |
| `double4` | hodnota2 |
| `double5` | živých |
| `double6` | čas na telefonu (ms od epochy), u serveru 0 |
| `timestamp` | čas zápisu, doplňuje Analytics Engine |

## Události ze serveru

| Typ | Detail | Hodnota |
|---|---|---|
| `mistnost_zalozena` | | |
| `hrac_pripojen` | | |
| `hrac_navrat` | `pauza`, když se vrátil do pauzy | |
| `hrac_odpojen` | `pauza`, když tím hru zastavil | |
| `pozdni_prichozi` | `hra-bezi`, `plno`, `jmeno` | |
| `partie_start` | `N sab` | limit šicht |
| `akce` | typ akce | ms od začátku fáze |
| `akce_bez_efektu` | typ akce, kterou reducer zahodil | |
| `akce_zamitnuta` | typ akce, kterou hráč nesměl poslat | |
| `faze` | předchozí fáze; detail2 `drive` (odevzdali všichni) nebo `cas` | trvání předchozí fáze v ms |
| `sichta_vysledek` | `padla` / `prosla` | sabotáží; hodnota2 velikost party |
| `rozprava_utnuta` | | po kolika ms |
| `rada_vysledek` | role vyhoštěného nebo `nikdo`; detail2 kandidáti, zdržení, nehlasující, tma | hlasů; hodnota2 kandidátů |
| `noc_odmena` | `vrazda`, `imunita`, `tma` | |
| `rano` | `vrazda`, `imunita`, `tma`, `nic` | |
| `partie_konec` | vítěz; detail2 důvod | trvání partie v ms; hodnota2 stínů |
| `znovu` | | ms od startu předchozí partie |
| `pauza_start` | kvůli komu | zbývalo ms |
| `pauza_konec` | | trvání pauzy ms |
| `hrat_bez_nej` | bez koho | |
| `uklid` | fáze, ve které místnost skončila | |

## Události z telefonu

| Typ | Detail | Hodnota |
|---|---|---|
| `nacteni` | rozměr okna; detail2 jazyk a typ připojení | ms do spuštění skriptu |
| `obrazovka` | nová obrazovka (`krok/faze`); detail2 předchozí | ms na předchozí obrazovce |
| `volba_rezimu` | `zalozit`, `pripojit`, `hotseat`; detail2 `misto_rozehrane` | |
| `pokracovat` | `hotseat` / `online`; detail2 fáze | |
| `znovu_klik` | `online` / `hotseat` | |
| `ukoncit` | `online`, `hotseat`, `pauza` | |
| `odejit` | `prehled`, `pauza` | |
| `zahodit_rozehranou` | `hotseat` / `online` | |
| `rage_klik` | prvek (`button:NOMINOVAT`, `div:`) | poloha v % šířky; hodnota2 v % výšky |
| `mrtvy_klik` | prvek mimo ovládání (`div:`, `span:`) | poloha |
| `klik_bez_efektu` | štítek tlačítka bez akce (`DO ŠATNY`) | |
| `chyba_js` | zpráva; detail2 soubor | |
| `karta_skryta`, `karta_zpet` | | ms mimo kartu |
| `sit_vypadek` | viditelnost karty při výpadku | |
| `sit_navrat` | | po kolika pokusech |
| `sit_odmitnuto` | `hra-bezi`, `plno`, `jmeno` | |
| `bdeni` | `ok` / `odmitnuto` | |
| `zapisnik`, `prehled`, `prehled_zamceny` | | |
| `sdilet_odkaz` | `share` / `schranka` | |
| `zvuk` | `zapnuto` / `vypnuto` | |
| `zalozeni_selhalo` | | |

## Kde se na to dívat

Cloudflare dashboard → Workers & Pages → Analytics Engine, nebo SQL API:

```bash
curl -s "https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/analytics_engine/sql" \
  -H "Authorization: Bearer <TOKEN s právem Account Analytics Read>" \
  --data "SELECT ..."
```

Token patří do `D:/ai/Apps/Secrets/sichta.txt`, ne do repa.

### Kolik partií a jak dopadly (posledních 30 dní)

```sql
SELECT toStartOfDay(timestamp) AS den, blob5 AS vitez, count() AS partii,
       avg(double3) / 60000 AS minut, avg(double1) AS hracu
FROM sichta_udalosti
WHERE blob1 = 'partie_konec' AND timestamp > NOW() - INTERVAL '30' DAY
GROUP BY den, vitez ORDER BY den
```

### Kolik startů skončilo, kolik jich zahájila stejná parta znovu

```sql
SELECT blob1 AS typ, count() FROM sichta_udalosti
WHERE blob1 IN ('mistnost_zalozena', 'partie_start', 'partie_konec', 'znovu')
  AND timestamp > NOW() - INTERVAL '30' DAY
GROUP BY typ
```

### Jak dlouho trvají fáze a jak často končí dřív

```sql
SELECT blob5 AS faze, blob6 AS jak, count() AS n, avg(double3) / 1000 AS sekund
FROM sichta_udalosti
WHERE blob1 = 'faze' AND blob5 != '' AND timestamp > NOW() - INTERVAL '30' DAY
GROUP BY faze, jak ORDER BY faze
```

### Kde lidi ťukají naprázdno

```sql
SELECT blob1 AS typ, blob4 AS faze, blob5 AS prvek, count() AS n
FROM sichta_udalosti
WHERE blob1 IN ('rage_klik', 'mrtvy_klik', 'klik_bez_efektu') AND timestamp > NOW() - INTERVAL '30' DAY
GROUP BY typ, faze, prvek ORDER BY n DESC LIMIT 50
```

### Kolik telefonů se vrátilo na další partii

```sql
SELECT count(DISTINCT blob9) AS telefonu, count(DISTINCT index1) AS mistnosti
FROM sichta_udalosti
WHERE blob2 = 'klient' AND blob9 != '' AND index1 != 'bez' AND timestamp > NOW() - INTERVAL '30' DAY
```

### Kdy se hraje

```sql
SELECT toHour(timestamp) AS hodina, count() AS startu
FROM sichta_udalosti
WHERE blob1 = 'partie_start' AND timestamp > NOW() - INTERVAL '90' DAY
GROUP BY hodina ORDER BY hodina
```

### Výpadky a pauzy

```sql
SELECT blob1 AS typ, blob4 AS faze, count() AS n, avg(double3) / 1000 AS sekund
FROM sichta_udalosti
WHERE blob1 IN ('sit_vypadek', 'pauza_start', 'pauza_konec', 'hrat_bez_nej') AND timestamp > NOW() - INTERVAL '30' DAY
GROUP BY typ, faze ORDER BY n DESC
```

## Co s tím dál

- Protokol partie (úkol 6.2 v [ukoly.md](ukoly.md)) může vzniknout z těchhle dat, když se k `partie_konec` přidá `sichta_vysledek` a `rada_vysledek` za stejný `index1`.
- Ladění sestav v `rules.ts`: poměr `partie_konec` podle vítěze a počtu hráčů je přesně to, co simulace odhadovala a playtest má změřit.
