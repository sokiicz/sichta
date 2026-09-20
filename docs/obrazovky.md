# Šichta — průchod hrou a soupis obrazovek

Doprovodný dokument k [design.md](design.md) (pravidla) a
[../brand/README.md](../brand/README.md) (vizuál).

Stav: návrh, 2026-09-20.

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
            ║  DOPOLEDNÍ ŠICHTA   (jen plná hra, 8+ hráčů)    ║
            ║   zadání ► volba ► výsledek                     ║
            ║     ▼                                           ║
            ║  ODPOLEDNÍ ŠICHTA                               ║
            ║   zadání ► volba ► výsledek                     ║
            ║     ▼                                           ║
            ║  ŠEPTANDA         (jen když šichta prošla)      ║
            ║     ▼                                           ║
            ║  ROZPRAVA         ← telefony dolů               ║
            ║     ▼                                           ║
            ║  NOMINACE ► výsledek ► RADA ► odhalení hlasů    ║
            ║     ▼                                           ║
            ║  NOC              (jen když odpolední padla)    ║
            ║   předák vybírá odměnu ► sabotéři volí oběť     ║
            ║   ostatní zapisují podezřelého                  ║
            ║     ▼                                           ║
            ║  RÁNO             co se v noci stalo            ║
            ╚═════════════════════════════════════════════════╝
                    │
                    ▼
            KONEC ► odhalení všech rolí ► ceny ► znovu
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
| A2 | **Kód místnosti** | v ruce | Šest znaků, velká klávesnice, sken QR |
| A3 | **Jméno** | v ruce | Jedno pole, návrh z posledně |
| A4 | **Šatna** | v ruce | Kód a QR pro ostatní, soupiska přicházejících, počet |
| A5 | **Nastavení** | v ruce | Jen zakladatel. Režim podle počtu, přepínače v3 |

### B. Rozdání rolí

| # | Obrazovka | Telefon | Obsah |
|---|---|---|---|
| B1 | **Role zakrytá** | v ruce | „Podrž palec." Stejná pro všechny role. V aplikaci se odkrývá držením, ne klikem |
| B2 | **Role odkrytá** | v ruce | Sabotér vidí druhého sabotéra a předáka, pracant nic |
| B3 | **Čeká se** | v ruce | Kdo už je připravený, kdo ne |

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
| E2 | **Nominace** | v ruce | Vyber jednoho. Všichni najednou |
| E3 | **Výsledek nominací** | v ruce | Kdo postupuje do rady a s kolika hlasy |
| E4 | **Rada** | v ruce | Hlasování mezi dvěma. Stíny mají hlas stínu |
| E5 | **Poslední slovo** | dolů | Kdo právě mluví a kolik mu zbývá. Ostatní mlčí |
| E5b | **Odhalení hlasů** | v ruce | Kdo koho volil, včetně hlasů stínů. Odkrývá se po jednom |
| E6 | **Vyhoštění** | v ruce | Kdo odchází a jaká byl role. Razítko |

### F. Noc

| # | Obrazovka | Telefon | Obsah |
|---|---|---|---|
| F1 | **Odměna** | v ruce | Jen předák. Vražda / Imunita / Tma. Že vražda příští noc nepůjde, se řekne dopředu |
| F2 | **Volba oběti** | v ruce | Sabotéři hlasují, předák pak rozhodne |
| F3 | **Podezřelý** | v ruce | Všichni ostatní. Zapiš tip, sčítá se do ceny na konci |
| F3b | **Čeká se na noc** | v ruce | Po odeslání. Kdo už odevzdal, kdo ne |
| F4 | **Ráno** | v ruce | Co se v noci stalo. Kdo chybí |

### G. Konec

| # | Obrazovka | Telefon | Obsah |
|---|---|---|---|
| G1 | **Konec hry** | v ruce | Kdo vyhrál a proč. **Žádná jména sabotérů**, ta přijdou až na G2 |
| G2 | **Odhalení** | v ruce | Všechny role, průběh, cena Nejlepší čuch |
| G3 | **Znovu** | v ruce | Stejná parta znovu, nebo zpět do šatny |

### H. Pomocné

| # | Obrazovka | Telefon | Obsah |
|---|---|---|---|
| H1 | **Přehled hry** | v ruce | Historie part, výsledků a hlasování. **Během rozpravy zamčeno** |
| H2 | **Tvá role** | v ruce | Připomenutí role přes podrž palec. Lidé zapomínají |
| H3 | **Pravidla** | v ruce | Krátká, vrstvená. Kolo, výhra, role |
| H4 | **Správa** | v ruce | Jen zakladatel. Čekat dál, hrát bez odpojeného, protáhnout odpočet |
| H5 | **Pauza** | v ruce | Odpočet viditelně stojí a je vidět proč. Vrátí se na stejné vteřině |

**Celkem 34 obrazovek.** Všechny jsou nakreslené a propojené do klikatelného průchodu.

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
`navigator.vibrate`, zdarma.

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
- **Odpojený hráč uprostřed tajné volby.** Vyřešeno: odpočet se zastaví a všem
  se ukáže proč (H5). Zakladatel může počkat, nebo hrát dál, a pak volba
  propadne jako MAKAT. Kolik vteřin se čeká, než se pauza nabídne, se doladí
  při hraní.
- **Délka předělu kola.** 1200 ms je odhad. Při šesti kolech je to sedm
  sekund za hru, což je v pořádku. Kdyby to štvalo, zkrátit na 800.
