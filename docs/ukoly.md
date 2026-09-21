# Úkoly v pořadí oprav

Vychází z [audit-aplikace.md](audit-aplikace.md) (2026-09-20). Čísla K, U, D odkazují na nálezy v něm.
Velikost: S = do hodiny, M = půl dne, L = den a víc. Každý úkol má napsané, kde se dělá a čím se ověří.

**Stav 2026-09-20 večer:** vlny 0 až 5 hotové kromě 4.7 (rada bez nominací do šesti živých), která čeká na playtest. Vlna 6 jsou nové funkce a je otevřená. Co je hotové, má křížek a krátkou poznámku, jak to dopadlo.

---

## Vlna 0 · Rozhodnutí

- [x] **R1** Zdroj pravdy pro sestavy: `rules.ts`. Tabulka v `design.md` §3.1 je z něj opsaná a `CLAUDE.md` to říká.
- [x] **R2** Hot seat je vývojová pomůcka, ne herní režim. Playtest je online. Úniky v něm se opravily (1.4, 3.10), ale priorita je nízká.
- [x] **R3** Dvě směny vypnuté pro všechny stoly, kód zůstává jako experiment krytý testem. Sestavy pro 9 až 12 hráčů přeměřené na jednu směnu. Cooldown vražd se počítá v kolech (prošlá šichta mezi dvěma vraždami stačí), tak to měřila simulace i tak to kód dělal; opravil se jen text, který tvrdil „příští noc“.
- [x] **R4** Návrhy oběti dotažené: sabotéři navrhují (i před volbou odměny), předák vidí návrhy u jmen a rozhodne.
- [x] **R5** Stolní obrazovka není v plánu. Wake lock a zvuk ze zakladatelova telefonu to musí unést.

---

## Vlna 1 · Blokery playtestu

- [x] **1.1 K1 · Náhodný seed online** · S
  Worker losuje seed při založení místnosti a znovu při každém startu partie, reducer ho bere povinně. Test „různé seedy dají různá rozdání“, integrační test porovnává tři místnosti.

- [x] **1.2 K2 · Imunita a Tma působí v další radě** · M
  Spotřebují se při sestavení rady (zapíší se do kola jako `imunni` a `tma`), imunita má cíl z obrazovky Odměny a ráno je veřejná. Testy na obojí.

- [x] **1.3 K3 · Nástupnictví předáka** · S
  `odebrat()` předá funkci dalšímu živému sabotérovi v pořadí sedadel. Test.

- [x] **1.4 K5 · Fronta noci v pořadí sedadel (hot seat)** · M
  `frontaProFazi` jde po sedadlech ve všech fázích. Předák má odměnu a oběť na svém kroku, ostatní sabotéři navrhují, pracanti tipují.

- [x] **1.5 K6 · Autorizace akcí** · M
  `src/game/opravneni.ts` a `opravneni.test.ts`. Worker zahodí, co neprojde; posun fáze, spojení a přidávání hráčů patří serveru, start a „hrát bez něj“ zakladateli, odměna předákovi. Obrazovka Pauza má jen HRÁT BEZ NĚJ.

- [x] **1.6 K7 · Časovač ze serveru, pauza, wake lock** · L
  `konecFaze` a čas serveru v každé zprávě, odpočet z něj; pauza jen v akčních fázích, pamatuje si zbývající čas a po návratu pokračuje od stejné vteřiny; wake lock v `src/ui/bdeni.ts`. Integrační test ověřuje výpadek uprostřed šichty.

- [x] **1.7 K4 · Dvě směny** · S
  Vypnuto v `rules.ts`, sestavy 9 a 12 přeměřené (`scratch/jedna-smena*.mjs`), test drží dvousměnnou cestu naživu.

- [x] **1.8 Testy z auditu** · M
  103 testů, z toho nové na seed, odměny, předáka, kvórum, pauzu, `fazeHotova`, oprávnění a časování pohledu.

---

## Vlna 2 · Robustnost online a pohledu

- [x] **2.1 K8** Hlasy až od odhalení, oběť až ráno, odměna stolu až ráno. Testy.
- [x] **2.2 K14** Jedinečné přezdívky, odpojení v šatně nezačnou, zakladatel může vyhodit, funkce zakladatele přejde na připojeného. Id hráčů z počítadla ve workeru.
- [x] **2.3 K16** Pozdní příchozí dostane `hra-bezi` (nebo `plno`, `jmeno`) a obrazovku Tudy ne.
- [x] **2.4 K15** Úklid: dohraná místnost po 6 h, prázdná šatna po dni.
- [x] **2.5** `fazeHotova()`: fáze skončí do dvou vteřin, když odevzdali všichni. Předák se počítá jako odevzdaný po volbě.
- [x] **2.6 U7** Pauza ukazuje zbývající čas i to, jak dlouho se čeká, z času serveru.
- [x] **2.7** Odpočet na jednom telefonu volá posun z efektu, ne z updateru.
- [x] **2.8 K17** Kosmetika: dvojitá podmínka, komentář workeru, token při plné místnosti, mrtvé tlačítko v online šatně.

---

## Vlna 3 · Obrazovky

- [x] **3.1 U1** Seznamy klíčované podle id. Zdvojená jména už nevzniknou (2.2).
- [x] **3.2 U2** Ráno ukazuje správné kolo.
- [x] **3.3 U3** Počty nominací a „nepostupují“ na obrazovce Před radu.
- [x] **3.4 U4** Poslední slovo pro každého kandidáta zvlášť, 30 s, při třech a víc 20 s.
- [x] **3.5 U5** Zadání zvýrazní mě, ne poslední řádek.
- [x] **3.6 B3** Po potvrzení role tlačítko říká, kolik jich už potvrdilo.
- [x] **3.7 F3b** Čeká se na noc se soupiskou, předák v ní nechybí.
- [x] **3.8 H1 + H2** Přehled hry (tlačítko vlevo dole) s historií a připomínkou role, během rozpravy zamčený.
- [x] **3.9 G3** Ještě jednou vrátí stejnou partu do šatny (akce `ZNOVU`, jen zakladatel).
- [x] **3.10 U6** Zápisník a přehled jen v ruce držitele, klíč podle identifikátoru partie.
- [x] **3.11 U8, U9, U10** Předěl počítá správně a skloňuje, obrazovka si dole nechá místo pod plovoucími tlačítky, úvodní tlačítko menším písmem.
- [x] **3.12 U11** Odkrytí role i klávesnicí, pojmenované přepínače v nastavení.
- [x] **3.13 U13** `robots.txt`, `sitemap.xml`, canonical, OG a Twitter meta.
- [x] **3.14 U12** Poznámka o iOS v `obrazovky.md` a v pravidlech.

---

## Vlna 4 · Herní pravidla

- [x] **4.1 K9** Věta o hlasu jen pro cíle se dvěma a víc hlasy, předák nejvýš jednou za partii, vlastní jméno ne. Testy.
- [x] **4.2 K10** Vyhoštění chce nadpoloviční většinu odevzdaných hlasů a nejméně dva. Zapsáno v `design.md` §3.2.
- [x] **4.3 K11** Návrhy oběti dotažené (R4).
- [x] **4.4 K12** Nejlepší čuch jen pro pracanty.
- [x] **4.5 K13** Hlas stínu se utratí použitím, i při remíze. Kód i design se shodují.
- [x] **4.6** Pětka: bez věty „určitě není sabotér“, v šatně označená jako tréninková.
- [ ] **4.7 Rada bez nominací do šesti živých** · M · **čeká na playtest**
  Přeskočit `nominace` a `kandidati`, hlasovat o komkoliv; text v pravidlech. Zatím se nedělá, je to změna pravidel bez odehrané partie.
- [x] **4.8** Imunita veřejná ráno.

---

## Vlna 5 · Dokumentace

- [x] **5.1 D1** `design.md` §3.1 opsané z `rules.ts`, `CLAUDE.md` upravené.
- [x] **5.2 D2** Rozprava v `design.md` §3.2: přehled zamčený.
- [x] **5.3 D3** Dvě směny označené jako experiment ve v1 vypnutý.
- [x] **5.4 D4** `design.md` §7 popisuje Durable Object; `supabase/` a `navod-supabase.md` smazané (v historii gitu do `4497454`).
- [x] **5.5 D5** `plan-stavby.md` s fází 2b, počty testů, `obrazovky.md` podle stavu.
- [x] **5.6 D6** Simulátor bez `Math.random()`, v hlavičce popsané rozdíly proti kódu.

---

## Vlna 6 · Nové funkce (otevřené)

- [x] **6.1 Měření chování** · M · hotovo 2026-09-21
  Workers Analytics Engine bez cookies. Worker zapisuje herní události (fáze, výsledky, odměny, konce, pauzy, zamítnuté akce), telefon posílá obrazovky, rage kliky, mrtvé kliky, chyby, výpadky. Sloupce a dotazy v [mereni.md](mereni.md).

- [x] **6.12 Předčasný konec a zahození rozehrané** · S · hotovo 2026-09-21
  Akce `UKONCIT` (jen zakladatel): konec bez vítěze, role se odhalí. Tlačítko na dvě ťuknutí v pauze, v přehledu (ostatní online odejdou) a na úvodu u rozehrané partie.

- [x] **6.13 Šatna na malém telefonu** · S · hotovo 2026-09-21
  Na jednom telefonu bez bloku s kódem, přidání hráče v seznamu a jako hlavní tlačítko, nastavení v hlavičce. Jedno tlačítko dole místo dvou.

- [x] **6.14 Úplná pravidla v appce** · S · hotovo 2026-09-21
  Obrazovka Pravidla je celý průvodce (role, kolo krok za krokem s časy, šeptanda, noc, rada, stíny, výhra, sestavy z `rules.ts`, etiketa, výpadky). Dostupná i během hry z přehledu. Šatna vyzve nováčky, role říká, co z ní plyne na šichtě, rozprava říká, co přijde po ní.

- [ ] **6.2 Protokol partie** · M
  Na obrazovce Odhalení tlačítko Sdílet: text a JSON s průběhem (party, výsledky, hlasy, vyhoštění, oběti, role). Jediný zdroj dat na doladění `rules.ts`. Doporučuji před playtestem.

- [ ] **6.3 Nastavení navíc** · S
  Délka rozpravy 3/4/5 min, limit šicht ±1, „tréninková partie“ (delší časy, nápověda na obrazovkách).

- [ ] **6.4 Ceny na konci** · S
  „Nejlepší lhář“ (sabotér s nejméně nominacemi), „Obětní beránek“ (pracant s nejvíc nominacemi).

- [ ] **6.5 Šeptanda pro stíny** · S · přepínač.

- [ ] **6.6 Tichá šichta** · S · přepínač: jen prošla / padla bez počtu.

- [ ] **6.7 v1.1 Mistr vybírá partu** · M
  Mistr se posouvá po sedadlech, výběr party nahradí los v `rozdatPartu`, fáze „výběr“ 45 s.

- [ ] **6.8 v1.2 Konvence sabotérů** · S · přepínač: pořadí sabotérů na obrazovce role a pravidlo „kazí nižší číslo“.

- [ ] **6.9 v3 Variabilní parametry** · S · přepínač: losování sestavy v oznámeném rozpětí mezi partiemi.

- [ ] **6.10 Dvě směny s dopolední odměnou** · M · experiment pro 9 a víc hráčů, až playtest ukáže, že stolu chybí stopy.

- [ ] **6.11 Anglická verze „Shift“** · M · až po usazení v1.

Vypuštěno: **6.1 Stolní obrazovka** (R5).
