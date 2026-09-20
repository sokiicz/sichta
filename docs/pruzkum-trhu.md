# Šichta — průzkum konkurence a žánru

**Datum:** 2026-09-19 · Doprovodný dokument k [sichta-design.md](sichta-design.md)

---

## Verdikt na jeden odstavec

Hra jako celek neexistuje. **Ale ani jedna její mechanika není nová** — všechno jsou přebrané, prověřené díly, poskládané jinak. To není problém: v party hrách originalita skoro vždycky prohrává a dobré hry vznikají rekombinací známého plus jedním novým nápadem. Ten nový nápad tu je právě jeden (sabotáž odemyká vraždu) a je nosný. Skutečné riziko projektu **není konkurence**. Jsou to dvě věci, které má design zabudované v sobě: telefon v ruce a plíživé nabalování komplexity.

---

## Mapa žánru — co už existuje

| Hra | Mise + sabotáž | Vyhoštění + vražda | Appka / telefony | Bez vypravěče | Fyzicky u stolu |
|-----|:---:|:---:|:---:|:---:|:---:|
| **The Resistance / Avalon** (2009) | ✅ | ❌ | ❌ | ✅ | ✅ |
| **Vlkodlaci / Městečko Palermo** | ❌ | ✅ | ❌ | ❌ | ✅ |
| **Blood on the Clocktower** | ❌ | ✅ | ❌ | ❌ | ✅ |
| **The Traitors: oficiální desková hra** (Goliath) | ✅ | ✅ | ❌ | ✅ | ✅ |
| **The Traitors: Anywhere** (oficiální, 2026) | ✅ | ✅ | WhatsApp | ✅ | ❌ |
| **Traitors Aboard** (2024) | ✅ | ❌ | ❌ | ✅ | ✅ |
| **Goblin's Gambit** (KS, dodání 2027) | ❌ | ❌ | TV + telefony | ✅ | ✅ |
| **Vlkodlačí appky** (Mafia Night, Wolvesville, Mafia Role Assigner…) | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Among Us** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Šichta** | ✅ | ✅ | ✅ | ✅ | ✅ |

**Žádný existující produkt nemá všech pět.** Nejblíž jsou dva a oba minou jinak:

- **The Traitors (Goliath)** má misi i vraždu i vyhoštění, ale je to krabice s komponentami, trvá ~90 minut a recenze o ní opakovaně píšou, že je *na adaptaci televizní show překvapivě složitá* a rodinám a příležitostným partám trvá, než ji pochopí.
- **The Traitors: Anywhere** (oficiální licence, All3Media, start UK podzim 2026) je **asynchronní hra přes WhatsApp na šest až patnáct dní** pro až 30 lidí. Úplně jiný produkt — ne večer u stolu.

**Vlkodlačích appek je plno** a per-telefon soukromé role bez vypravěče umí prakticky všechny. Technologie není výhoda. Výhoda musí být v herním designu nad ní — a ten je ze tří čtvrtin Avalon.

---

## Kde je díra doopravdy

Ne v „appka řídí sociální dedukci" — to umí kdekdo. Díra je v tom, že:

> **Appkové hry berou mechaniky z Vlkodlaků** (role, noc, vražda, věštec) **a nikdo nepostavil appku nad mechanikami z Avalonu** (mise, sabotáž, tvrdá stopa) **a nepřidal k nim vyhazování.**

Vlkodlačí appky proto pořád trpí tím, čím trpěli Vlkodlaci: bez věštce nemá vesnice žádnou tvrdou informaci a hra visí na čtení obličejů. Avalon tu informaci má, ale nemá vraždu, dramaturgii ani nic, co by appka obsluhovala.

Druhá, menší díra: **česky.** Městečko Palermo a Vlkodlaci jsou v Česku zavedená klasika s vypravěčem. Nic modernějšího v češtině neexistuje.

---

## Brutální část — co je doložené a míří přímo na tenhle design

### 1. Telefon v ruce je doložený zabiják, ne moje teorie
Z diskuze o Avalonu na BoardGameGeek: hra vyžaduje plnou pozornost a *„pokud je jediný člověk hodně zaneprázdněný telefonem, zkazí to zážitek celému stolu."*

Tohle je nejzávažnější nález celého průzkumu. Navrhujeme dát **všem** telefon do ruky ve hře, jejíž deklarovaná priorita je diskuze. Pravidlo „mobily dolů během rozpravy" není kosmetika — je to podmínka, za které hra vůbec funguje, a musí být vynucené UI, zvukem a tempem, ne poznámkou v pravidlech.

### 2. Oficiální adaptace už narazila přesně na naši v2/v3
The Traitors od Goliathu je kritizovaná za složitost — a to je hra **bez** ekonomiky, upgradů, miniher a falešných zrádců. Naše v2 a v3 míří na tu samou zeď rychleji. Jediná obrana je disciplína v1.

### 3. Licence je aktivní a monetizuje se
All3Media právě spouští oficiální produkt pro hraní doma. Název použít nejde (to jsme věděli) a případná komercializace by běžela ve stínu licencovaného konkurenta. Pro hru mezi kamarády irelevantní, pro cokoli většího zásadní.

### 4. „Obyčejný hráč nemá co dělat" je nejčastější stížnost žánru
Doložená stížnost: hráči dostanou roli vesničana a *mají pocit, že nemají co dělat.* Šichta z principu **nemá žádné role** — což je ta varianta žánru, která je na tuhle stížnost nejvíc vystavená. Naše protiopatření (chození na šichty, tajné tlačítko, zapisování podezřelého, hlas stínu) jsou reálná, ale je to boj proti známé slabině, ne její obejití.

### 5. Konkurence tuhle díru vidí a prodává se přes ni
Goblin's Gambit se marketingově vymezuje slovy: *„Na rozdíl od jiných hidden-role her, kde půlka stolu tiše nic nedělá, každý hráč dělá každé kolo smysluplné rozhodnutí."* Je to přesně ta mezera, kterou míříme zaplnit, a nejsme v ní sami.

### 6. Parta rozhodne víc než design
Doložené: Avalon je *„hit or miss podle toho, s kým ho hraješ"*, a část lidí ho aktivně odmítá, protože jim nesedí lhaní a obviňování přátel do očí. Tohle žádná mechanika nespraví a rozhodne o tom, jestli si parta řekne „ještě jednou", víc než cokoli, co postavíme.

---

## Co průzkum naopak potvrdil

1. **Hlas stínu je správná volba, a to zásadně.** U Blood on the Clocktower se opakovaně uvádí, že *hru obvykle rozhodnou hlasy a názory mrtvých* a že nikdo nesedí mimo. Je to jedna z nejchválenějších věcí nejlepší hry v žánru. Naše rozhodnutí vyhodit paritu a opřít se o hlasy Stínů má oporu v praxi.
2. **Opravujeme přesně to, na co Vlkodlaci umírají.** Doložené selhání: vypravěč sedí mimo, a vyřazení hráči se nudí a stanou se *druhým, horším zdrojem informací — začnou si šeptat a stůl jim to z obličeje přečte.* Šichta obojí ruší.
3. **Motor dedukce je správně zvolený.** Avalon je doloženě *stabilnější a dedukčnější* než Vlkodlaci právě proto, že se nevyřazuje a každé kolo přináší tvrdou stopu. Bereme si jeho motor a přidáváme dramaturgii, která mu chybí.
4. **Délka sedí.** Traitors Aboard 30–45 min, oficiální The Traitors ~90 min a je za to kritizovaný. Náš cíl 45–55 min je v tom správném pásmu.

---

## Co bych po průzkumu změnil

- **„Mobily dolů" povýšit z pravidla na funkci.** Aplikace by během rozpravy měla jít do stavu, kde na displeji není nic než timer — žádné seznamy, žádná historie k listování. Kdo chce něco dohledat, musí se zeptat nahlas. Tím se historie stane předmětem diskuze místo soukromého čtení.
- **Nikdy netvrdit, že je to originální.** Není. Je to Avalon s dramaturgií Zrádců, hlasem stínu z Krvavky a jedním novým spojením. To je dobrý základ a špatný marketingový slogan.
- **v2 a v3 brát jako hypotézy, ne jako plán.** Oficiální adaptace ukazuje, kam vede nabalování. Každá další vrstva potřebuje odehraný důkaz, že bez ní je hra slabší.

---

## Zdroje

- [The Traitors — BoardGameGeek](https://boardgamegeek.com/boardgame/376656/the-traitors) · [recenze, The Review Studio](https://thereviewstudio.co.uk/2025/06/08/the-traitors-board-game/) · [Zatu Games](https://zatu.com/en-us/blogs/reviews/the-traitors-board-game-review)
- [The Traitors: Anywhere — Variety](https://variety.com/2026/digital/global/the-traitors-anywhere-whatsapp-game-1236772319/) · [oficiální web](https://thetraitorsanywhere.com/)
- [Avalon — The Good, the Bad and the Boring (BGG)](https://boardgamegeek.com/thread/1132646/avalon-the-good-the-bad-and-the-boring) · [Avalon vs One Night Werewolf (BGG)](https://boardgamegeek.com/thread/1276334/avalon-vs-one-night-werewolf-a-comparative-review) · [The Resistance — Wikipedia](https://en.wikipedia.org/wiki/The_Resistance_(game))
- [Blood on the Clocktower — Wikipedia](https://en.wikipedia.org/wiki/Blood_on_the_Clocktower) · [recenze, Wargamer](https://www.wargamer.com/blood-on-the-clocktower/review) · [Meeple Mountain](https://www.meeplemountain.com/reviews/blood-on-the-clocktower-02/)
- [Werewolf without Player Elimination (BGG)](https://boardgamegeek.com/thread/2287147/werewolf-without-player-elimination) · [Mafia — Wikipedia](https://en.wikipedia.org/wiki/Mafia_(party_game))
- [Traitors Aboard — BGG](https://boardgamegeek.com/boardgame/403000/traitors-aboard) · [pravidla](https://officialgamerules.org/game-rules/traitors-aboard/)
- [Goblin's Gambit](https://goblinsgambit.io/) · [Kickstarter](https://www.kickstarter.com/projects/goblinsgambit/goblins-gambit-hidden-role-social-deduction-516-players)
- [The Problem With Social Deduction Board Games](https://bumblingthroughdungeons.com/the-problem-with-social-deduction-board-games/)
- [Vlkodlaci — Wikipedie](https://cs.wikipedia.org/wiki/Vlkodlaci_(spole%C4%8Densk%C3%A1_p%C3%A1rty_hra)) · [Městečko Palermo — Hranostaj](https://www.hranostaj.cz/hra288)
- Vlkodlačí appky: [Mafia Night](https://mafianight.io/werewolf) · [Mafia Role Assigner](https://mafiarole.com/) · [Wolvesville Classic](https://apps.apple.com/us/app/wolvesville-classic/id1322989325)
