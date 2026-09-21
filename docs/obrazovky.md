# Šichta — průchod hrou a soupis obrazovek

Doprovodný dokument k [design.md](design.md) (pravidla) a
[../brand/README.md](../brand/README.md) (vizuál).

Stav: postavené, 2026-09-20. Sloupec **Stav** říká, co z návrhu v aplikaci je.

---

## 1. Průchod hrou

```
ÚVOD ──┬── založit ──► NASTAVENÍ ──┐
       └── připojit ──► KÓD ► JMÉNO ┴──► ŠATNA ──► ROZDÁNÍ ROLÍ
                                                        │
                    ┌───────────────────────────────────┘
                    ▼
            ╔═══ KOLO (opakuje se) ═══════════════════════════╗
            ║  PŘEDĚL KOLA                                    ║
            ║     ▼                                           ║
            ║  ŠICHTA           (dvě směny jsou vypnuté)       ║
            ║   zadání ► volba ► výsledek                     ║
            ║     ▼                                           ║
            ║  ŠEPTANDA         (jen když šichta prošla)      ║
            ║     ▼                                           ║
            ║  ROZPRAVA         ← telefony dolů               ║
            ║     ▼                                           ║
            ║  NOMINACE ► kandidáti ► poslední slovo          ║
            ║   ► RADA ► odhalení hlasů ► vyhoštění           ║
            ║     ▼                                           ║
            ║  NOC              (jen když šichta padla)       ║
            ║   předák vybírá odměnu ► sabotéři navrhují oběť ║
            ║   ostatní zapisují podezřelého ► čeká se        ║
            ║     ▼                                           ║
            ║  RÁNO             co se v noci stalo            ║
            ╚═════════════════════════════════════════════════╝
                    │
                    ▼
            KONEC ► odhalení všech rolí ► ceny ► znovu (stejná parta do šatny)
```

---

## 2. Soupis obrazovek

Sloupec **Telefon** říká, jestli má být v ruce, nebo má ležet lícem dolů.
Je to designové zadání, ne poznámka: obrazovka pro „dolů" nesmí nabízet nic,
co by lákalo do ní koukat.

### A. Před hrou

| # | Obrazovka | Telefon | Obsah |
|---|---|---|---|
| A1 | **Úvod** | v ruce | Značka, dvě tlačítka: Založit šichtu / Připojit se |
| A2 | **Kód místnosti** | v ruce | Šest znaků, velká klávesnice. Sken QR není, odkaz ze šatny ho nahrazuje |
| A3 | **Jméno** | v ruce | Jedno pole, návrh z posledně |
| A4 | **Šatna** | v ruce | Kód a odkaz pro ostatní, soupiska (odpojení zvlášť), zakladatel může vyhodit |
| A5 | **Nastavení** | v ruce | Jen zakladatel. Režim podle počtu, přepínače v3 |

### B. Rozdání rolí

| # | Obrazovka | Telefon | Obsah |
|---|---|---|---|
| B1 | **Role zakrytá** | v ruce | „Podrž palec." Stejná pro všechny role. V aplikaci se odkrývá držením, ne klikem |
| B2 | **Role odkrytá** | v ruce | Sabotér vidí druhého sabotéra a předáka, pracant nic |
| B3 | **Čeká se** | v ruce | Na tlačítku Jsem připraven: kolik jich už potvrdilo |

### C. Šichta

| # | Obrazovka | Telefon | Obsah |
|---|---|---|---|
| C1 | **Předěl kola** | dolů | Celoplošné „ŠICHTA 3 / DOPOLEDNÍ". Drží 1,2 s |
| C2 | **Zadání party** | v ruce | Kdo jde na šichtu. Veřejné, stejné pro všechny |
| C3 | **Tajná volba** | v ruce | MAKAT / KAZIT. Jen parta. Obě role vidí obě tlačítka stejně |
| C4 | **Čekání na partu** | v ruce | Pro ty mimo partu. Soupiska, kdo už odevzdal |
| C5 | **Výsledek šichty** | v ruce | Prošla / padla, počet sabotáží. Otiskne se jako razítko |

### D. Informace

| # | Obrazovka | Telefon | Obsah |
|---|---|---|---|
| D1 | **Šeptanda** | dolů | Jedna pravdivá věta. Velká, sama na obrazovce |

### E. Rozprava a rada

| # | Obrazovka | Telefon | Obsah |
|---|---|---|---|
| E1 | **Rozprava** | **dolů** | Jen obří odpočet. Nic jiného. Historie je zamčená |
| E2 | **Nominace** | v ruce | Vyber jednoho, nebo nikoho. Jedno tlačítko, ťuknutí na vybraného ho odznačí |
| E3 | **Výsledek nominací** | v ruce | Kdo postupuje do rady a s kolika nominacemi, kdo nepostupuje, kdo má imunitu |
| E4 | **Rada** | v ruce | Hlasování mezi dvěma. Stíny mají hlas stínu |
| E5 | **Poslední slovo** | dolů | Každý kandidát zvlášť: kdo právě mluví, kolik zbývá, kdo je další |
| E5b | **Odhalení hlasů** | v ruce | Kdo koho volil, včetně hlasů stínů. Odkrývá se po jednom, nakonec kdo se zdržel a kdo nehlasoval |
| E6 | **Vyhoštění** | v ruce | Kdo odchází a jaká byl role. Razítko |

### F. Noc

| # | Obrazovka | Telefon | Obsah |
|---|---|---|---|
| F1 | **Odměna** | v ruce | Jen předák. Vražda / Imunita (s výběrem koho) / Tma. Že vražda v příštím kole nepůjde, se řekne dopředu |
| F2 | **Volba oběti** | v ruce | Sabotéři navrhují (i před volbou odměny), předák vidí návrhy u jmen a rozhodne |
| F3 | **Podezřelý** | v ruce | Všichni ostatní. Zapiš tip, sčítá se do ceny na konci |
| F3b | **Čeká se na noc** | v ruce | Po odeslání. Jen kolik lidí odevzdalo, nikdy kdo: poslední bývá předák |
| F4 | **Ráno** | v ruce | Co se v noci stalo. Kdo chybí, kdo má imunitu, jestli bude rada potmě |

### G. Konec

| # | Obrazovka | Telefon | Obsah |
|---|---|---|---|
| G1 | **Konec hry** | v ruce | Kdo vyhrál a proč. **Žádná jména sabotérů**, ta přijdou až na G2 |
| G2 | **Odhalení** | v ruce | Všechny role, průběh, cena Nejlepší čuch |
| G3 | **Znovu** | v ruce | Zakladatel vrátí stejnou partu do šatny, role se rozdají nanovo |

### H. Pomocné

| # | Obrazovka | Telefon | Obsah |
|---|---|---|---|
| H1 | **Přehled hry** | v ruce | Tlačítko vlevo dole. Historie part, výsledků, rad a nocí. **Během rozpravy zamčeno** |
| H2 | **Tvá role** | v ruce | Uvnitř přehledu, přes podrž palec. Lidé zapomínají |
| H3 | **Pravidla** | v ruce | Krátká, vrstvená. Kolo, výhra, role |
| H4 | **Správa** | v ruce | Jen zakladatel: hrát bez odpojeného (na obrazovce Pauza), vyhodit ze šatny |
| H5 | **Pauza** | v ruce | Odpočet viditelně stojí a je vidět proč a jak dlouho. Vrátí se na stejné vteřině |
| H6 | **Tudy ne** | v ruce | Server nepustil dovnitř: hra už běží, je plno, chybí přezdívka |

**Celkem 35 obrazovek.** Všechny jsou postavené v `src/screens/`. Sken QR z návrhu nahradil odkaz.

**Názvosloví:** vyřazený hráč je **stín**, jeho jediný hlas je **hlas stínu**. Slovo „záhrobí" se nepoužívá.

**Proč je přehled během rozpravy zamčený:** kdo si chce ověřit, kdo byl na
druhé šichtě, musí se zeptat nahlas. Tím se historie stane předmětem hádky
místo soukromého čtení. Je to jediná věc, která brání tomu, aby se rozprava
rozpadla na deset lidí listujících v telefonu.

---

## 3. Animace a přechody

Pravidlo shora: **žádná knihovna.** Všechno je CSS transition nebo keyframe,
nula kilobytů JavaScriptu navíc. Nic nesmí zdržet vstup.

### Co si zaslouží animaci

| Kde | Co se děje | Délka | Proč |
|---|---|---|---|
| **Předěl kola** | Celoplošná deska sjede shora, drží nápis, odjede | 1200 ms | Rituál. Dává hře rytmus a zakryje načtení stavu |
| **Odkrytí role** | Rozostření 14 px → 0 při stisku palce | 180 ms | Fyzický pocit, že něco odkrýváš |
| **Výsledek šichty** | Razítko dosedne: scale 1,08 → 1 a lehké pootočení | 260 ms, po 600 ms prodlevě | Ta prodleva je celé drama. Nejdřív ticho, pak rána |
| **Odhalení hlasů** | Řádky se odkrývají po jednom | 220 ms každý, 260 ms rozestup | Nejdramatičtější moment kola. Naráz by vyšuměl |
| **Vyhoštění a role** | Jméno, pauza 800 ms, pak role | 300 ms | Stejný princip jako u razítka |
| **Odpočet, posledních 10 s** | Číslo o 6 % větší, rez tmavne, tep na každou vteřinu | 1000 ms smyčka | Tlak bez zvuku |
| **Přechod mezi fázemi** | Posun o 12 px nahoru a prolnutí | 200 ms | Hra jde pořád dopředu, nikdy zpátky |

### Co animaci nedostane

Žádný parallax, žádné částice, žádné poletující ikony. Žádný spinner:
když se něco načítá pod 150 ms, neukazuje se nic. Nic kromě předělu kola
a odhalení hlasů netrvá přes 400 ms.

`prefers-reduced-motion: reduce` vypíná všechno. Prodlevy zůstávají,
protože to je dramaturgie, ne pohyb.

### Pomocné prvky, které nesou víc než animace

**Soupiska místo spinneru.** Kdekoliv se čeká na ostatní, nikdy se netočí
kolečko. Ukáže se soupiska a dlaždice se vyplňují, jak lidi odevzdávají.
Je to informace i napětí zároveň: vidíš, kdo se ještě nerozhodl, a na koho
se všichni dívají.

**Haptika.** Krátká vibrace na: odevzdání volby, změnu fáze, „dnes v noci
jsi přišel o hlas". V hře, kde telefony leží lícem dolů, je vibrace jediný
způsob, jak dát vědět, že se něco stalo, aniž by se do toho lidi dívali.
`navigator.vibrate`, zdarma. **iPhone ji neumí**, tam zbývá zvuk ze
zakladatelova telefonu.

**Zvuk jen z jednoho telefonu.** Deset mobilů hrajících stejný gong je
chaos. Zvuk vydává jen zakladatelův telefon, který leží na stole jako
reproduktor stolu. Ostatní mají jen vibraci. Tři zvuky celkem: začátek kola,
konec rozpravy, odhalení vyhoštěného.

**Stav odevzdání v patičce.** Tenký pruh „3 ze 4 odevzdali" na každé
čekací obrazovce. Nikdy neukazuje kdo, jen kolik.

---

## 3b. Zvuk a haptika

Zvuk se negeneruje ze souborů, ale z WebAudio oscilátorů (`src/ui/zvuk.ts`),
takže nestojí ani bajt z rozpočtu níž a nemusí se nic předstahovat.

| Fáze | Zvuk | Vibrace |
|---|---|---|
| Zadání šichty | Tovární houkačka | krátká trojice |
| Výsledek | Vzestupná dvojice / sestupný skřípot | podle výsledku |
| Vyhoštění | Rána | dlouhá |
| Ráno s obětí | Rána | dlouhá |
| Ráno bez oběti | ticho | krátká trojice |
| Konec | Houkačka | pětice |
| Každý dotek na tlačítko | ticho | 14 ms |

Tři pravidla, která se nesmí porušit:

1. **Zvuk nikdy neprozradí roli.** Vybírá se výhradně z veřejné části pohledu.
   MAKAT a KAZIT znějí stejně, jinak by stůl poznal sabotéra podle ucha.
2. **Nahlas hraje jeden telefon.** Hot seat vždycky, online zakladatelův.
   Osm telefonů houkajících přes sebe je rámus, ne atmosféra. Vibrace má
   naopak každý svoje, protože je soukromá.
3. **Vibrace až po prvním doteku.** Chrome ji dřív odmítne a píše chybu do
   konzole, a odpočet doběhne i bez doteku.

Vypnout jde v pravidlech, stav si telefon pamatuje.

---

## 4. Rychlost načítání

| Položka | Rozpočet |
|---|---|
| Písma | Anton + Karla, podmnožina latin-ext, preload. Do 45 kB |
| Obrázky | Žádné. Značka i ikony jsou inline SVG |
| JS | Vite build, bez animační knihovny. Do 120 kB gzip |
| CSS | Kritické inline, zbytek jeden soubor |
| **Celkem první načtení** | **do 200 kB** |

Hra se spouští na deseti telefonech naráz na cizí wifi nebo na datech.
Když se první obrazovka nenačte do dvou sekund, parta se rozhoduje, jestli
to má cenu. Tohle není optimalizační cvičení, je to podmínka.

Fáze si dopředu načítají obrázek další obrazovky? Nemají co, žádné nejsou.
Proto to jde utáhnout.

---

## 5. Co ještě není rozhodnuté

- **Nominace při malém stole.** Při pěti živých je nominace dvou kandidátů
  skoro celá tabulka. Možná při méně než šesti živých nominace vypadne
  a hlasuje se rovnou o komkoliv.
- **Odpojený hráč uprostřed tajné volby.** Vyřešeno: po osmi vteřinách bez
  spojení se odpočet zastaví a všem se ukáže proč (H5). Zakladatel může počkat,
  nebo hrát bez něj, a pak volba propadne jako MAKAT. Tam, kde se od hráče nic
  nečeká (rozprava, výsledek), se nezastavuje nic.
- **Délka předělu kola.** 1200 ms je odhad. Při šesti kolech je to sedm
  sekund za hru, což je v pořádku. Kdyby to štvalo, zkrátit na 800.
