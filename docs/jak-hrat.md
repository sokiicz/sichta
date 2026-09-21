# Jak hrát Šichtu

Průvodce pro lidi, kteří o hře nikdy neslyšeli. Stav pravidel: 2026-09-21,
odpovídá tomu, co aplikace opravdu dělá. Designové zdůvodnění je v
[design.md](design.md), tohle je návod ke hraní.

---

## 1. Co to je

Šichta je společenská hra na hádání a lhaní pro 5 až 12 lidí u jednoho stolu.
Pokud znáš Mafii, Palermo, Avalon nebo televizní Zrádce, jsi doma: část party
jsou tajní **sabotéři**, zbytek jsou **pracanti**. Pracanti musí sabotéry
najít a vyhostit. Sabotéři musí vydržet nepoznaní.

Rozdíl proti Mafii je v tom, odkud se berou stopy. Každé kolo jde půlka stolu
na **šichtu**. Kdo je v partě, vidí všichni. Každý člen party pak na telefonu
tajně zmáčkne MAKAT nebo KAZIT. Když nikdo nekazil, šichta prošla. Když aspoň
jeden kazil, šichta padla a stůl se dozví, kolik lidí kazilo. To je jediný
tvrdý důkaz ve hře a zároveň jediná cesta sabotérů k odměně. Každá sabotáž
tedy prozradí, že mezi tou partou někdo je, a přesto se bez ní sabotéři
nikam nedostanou.

Aplikace nahrazuje vypravěče. Rozdá role, hlídá čas, ukazuje každému jen to,
co smí vidět, a spočítá hlasy. Nikdo nemusí sedět mimo hru.

## 2. Co potřebuješ

- **5 až 12 lidí** u jednoho stolu. Šest a víc je ideál, pětka je tréninková
  partie (viz kapitola 10).
- **Každý svůj telefon** s připojením k internetu. Žádná instalace, žádná
  registrace. Otevře se adresa, zadá se přezdívka, hraje se.
- **Jeden večer.** Partie s 5 až 7 lidmi trvá kolem půl hodiny, s 8 až 12
  lidmi 45 minut až hodinu.
- **Zvuk na jednom telefonu.** Houkačku, která ohlašuje fáze, pouští za celý
  stůl telefon toho, kdo šichtu založil. Ostatní ji mají vypnutou.

## 3. Kdo je kdo

**Pracant.** Většina stolu. Na šichtě umí jen makat. Vyhrává, když stůl
vyhostí posledního sabotéra.

**Sabotér.** Tajná menšina. Sabotéři se od začátku znají jmenovitě. Na šichtě
můžou kazit, ale nemusí. Vyhrávají, když dojdou šichty a aspoň jeden z nich
je naživu, nebo když nezůstane žádný živý pracant.

**Předák.** Jeden ze sabotérů. Ostatní sabotéři vědí, kdo to je, stůl ne.
V noci vybírá, co si sabotéři vezmou za padlou šichtu, a rozhoduje, kdo
umře. Když předák odejde ze hry, přebírá to další sabotér podle pořadí u
stolu.

**Stín.** Každý po vyhoštění nebo po vraždě. Neodchází od stolu.
Mluví dál, hádá se dál, jen ztratil moc: nechodí na šichty, nenominuje,
nemůže být nominován a má jediný hlas na celý zbytek hry.

Počet sabotérů je vždy veřejný. Stůl ví, kolik jich hledá.

## 4. Jak se vyhrává

- **Pracanti vyhrají**, jakmile je vyhoštěn poslední sabotér.
- **Sabotéři vyhrají**, když doběhne limit šicht a aspoň jeden sabotér žije,
  nebo když nezůstane žádný živý pracant.

Limit šicht je počet kol, které má stůl k dispozici. U šesti lidí jsou to
čtyři kola, u osmi tři. Je to jediné, co pracanty tlačí: hoří jim termín,
a proto dělají ukvapená rozhodnutí. Ta rozhodnutí jsou hra.

Žádné pravidlo o rovnosti počtů není. I jeden pracant proti dvěma sabotérům
může vyhrát, protože stíny mají hlasy.

## 5. Než se začne hrát

1. Jeden z vás otevře aplikaci a ťukne **ZALOŽIT ŠICHTU**. Zadá přezdívku
   a dostane šestimístný **kód**. Ten je vidět v šatně, a tlačítkem POSLAT
   ho pošle ostatním jako odkaz.
2. Ostatní ťuknou **PŘIPOJIT SE**, zadají kód a přezdívku. Přezdívka je
   to, co bude vidět celý stůl. Když se dvě shodnou, aplikace je rozliší
   číslem.
3. V **šatně** je vidět, kdo už přišel. Zakladatel může nepatřičného hráče
   vyhodit křížkem a v NASTAVENÍ zapnout nebo vypnout dvě volby (viz
   kapitola 12).
4. Až je vás dost, zakladatel ťukne **ZAČÍT ŠICHTU**. Od té chvíle se nikdo
   další nepřipojí.

**Rozdání rolí.** Každý na svém telefonu podrží prst na tmavém poli a přečte
si, kdo je. Jakmile pustí, role se zakryje. Sabotér vidí i jména ostatních
sabotérů a kdo z nich je předák. Až všichni ťuknou JDU NA TO, začíná první
kolo. Tuhle obrazovku vidí všichni stejně, ať jsou kdokoliv. Nikdo nepozná
roli podle toho, jak dlouho kdo kouká.

## 6. Kolo krok za krokem

Jedno kolo je jedna šichta. Časy jsou stropy: fáze, ve které už všichni
odevzdali, skončí sama do dvou vteřin.

| Fáze | Čas | Telefon | Co se děje |
|---|---|---|---|
| **Předěl** | 2 s | | „Začíná šichta 3." Kolik šicht ještě zbývá. |
| **Zadání** | 15 s | v ruce | Aplikace vylosuje partu na šichtu, zhruba půlku živých. Vidí ji celý stůl a zůstane v přehledu navždy. |
| **Šichta** | 45 s | v ruce | Každý člen party tajně ťukne **MAKAT** nebo **KAZIT**. Pracantovi KAZIT nic neudělá, ale tlačítko vypadá stejně, aby nikdo nepoznal roli přes stůl. Sabotér vidí, kdo ze sabotérů je v partě s ním. Kdo v partě není, jen čeká. |
| **Výsledek** | 22 s | dolů | „Šichta prošla", nebo „Šichta padla, kazili 2". Počet sabotáží je veřejný. Zapamatuj si, kdo byl v partě. |
| **Šeptanda** | 20 s | v ruce | Jen když šichta prošla. Každý dostane vlastní pravdivou větu. Kapitola 7. |
| **Rozprava** | 3 až 5 min | **lícem dolů** | Mluví se. Aplikace ukazuje jen odpočet. Nadpoloviční většina živých může rozpravu utnout tlačítkem. |
| **Nominace** | 60 s | v ruce | Každý živý tajně nominuje jednoho hráče, nebo nikoho. |
| **Kandidáti** | 15 s | | Do rady jdou dva s nejvíc nominacemi. Při shodě na druhém místě všichni, kdo ji mají. |
| **Poslední slovo** | 30 s na hlavu | dolů | Každý kandidát dostane slovo. Při třech a víc kandidátech 20 s. |
| **Rada** | 45 s | v ruce | Každý živý hlasuje pro jednoho kandidáta, nebo se zdrží. Stín může utratit svůj jediný hlas. |
| **Hlasy** | 18 s | dolů | Aplikace ukáže, kdo koho volil, kdo se zdržel a kdo nehlasoval. |
| **Vyhoštění** | 15 s | dolů | Odchází jen ten, kdo má nadpoloviční většinu odevzdaných hlasů a nejméně dva. Jinak nikdo. Vyhoštěnému se veřejně ukáže role. |
| **Noc** | 60 s | v ruce | Jen když šichta padla. Předák vybere odměnu, sabotéři navrhují oběť, všichni ostatní si zapíší hlavního podezřelého. Kapitola 8. |
| **Ráno** | 15 s | dolů | Kdo v noci umřel, kdo má imunitu, nebo že bude tma. Když nic, tak nic. |

Rozprava trvá 3 minuty do šesti živých, 4 minuty do devíti, 5 minut nad
devět. Když šichta prošla, noc a ráno se přeskočí a jde se rovnou na další
kolo.

**Proč mají být telefony během rozpravy lícem dolů.** Hra je v tom, co se
řekne nahlas. Kdo si potřebuje ověřit, kdo byl na druhé šichtě, musí se
zeptat, a stůl slyší, na co se ptá. Přehled šicht je proto během rozpravy
zamčený.

## 7. Šeptanda

Odměna pracantů za prošlou šichtu. Každý živý hráč dostane **jednu vlastní
větu, která je vždy pravdivá.** Nikdo si cizí větu neověří. Pracant ji může
nahlas říct a hájit. Sabotér dostal větu ze stejného pytle, ale k ničemu mu
není, protože role už zná. Musí lhát, nebo mlčet.

Věty vypadají třeba takhle:

- „Aspoň jeden z téhle dvojice je pracant: Klára, Tomáš."
- „Aspoň jeden z téhle trojice je sabotér: Honza, Petr, Lucie."
- „Určitě není sabotér: Martin." (u pěti hráčů se nerozdává)
- „V kole 2 nominoval právě jeden sabotér."
- „V kole 1 padl hlas aspoň jednoho sabotéra na: Petra."
- „V kole 2 byl předák v partě na šichtě."
- „Šichta v kole 1 prošla, a přesto v ní sabotér byl."

Za jednu prošlou šichtu vzniknou nejvýš tři různé věty a rozdají se mezi
všechny. U většího stolu proto několik lidí dostane tutéž větu. To je
záměr: dva lidi se stejnou větou se potvrzují a ten, kdo si větu vymýšlí,
riskuje, že netrefí cizí.

Žádná věta není důkaz. Je to pomluva, o které se má mluvit.

## 8. Padlá šichta a noc

Padlá šichta neznamená automaticky vraždu. **Předák vybere jednu ze tří
odměn:**

| Odměna | Co udělá |
|---|---|
| **Vražda** | Jeden hráč dnes v noci končí a stane se stínem. |
| **Imunita** | Kdokoliv podle volby předáka, klidně pracant, nemůže v nejbližší radě skončit mezi kandidáty. Nominace na něj propadnou. |
| **Tma** | U nejbližší rady se neukáže, kdo koho volil. |

**Vraždit nejde dvě kola po sobě.** Po vraždě je tlačítko v dalším kole
zašedlé. Prošlá šichta mezi dvěma vraždami stačí.

**Jak noc probíhá.** Sabotéři na svých telefonech navrhují oběť a předák
vidí návrhy u jmen. Rozhodne, jestli poslechne, nebo zabije podle sebe.
Sabotéři vidí, co předák vybral. Všichni ostatní zatím na svém telefonu
zapisují, koho mají za hlavního podezřelého. Nikdo tedy nepozná, kdo
v noci opravdu něco rozhoduje. Ráno se stůl dozví oběť, imunitu i tmu.
Imunita je veřejná schválně: „proč zrovna Klára?" je téma do rozpravy.

Podezřelí ze všech nocí se na konci sečtou do ceny **Nejlepší čuch**.

## 9. Rada

- **Nominovat nikoho je tah**, ne nečinnost. Stejně jako zdržet se
  hlasování. Stůl vidí rozdíl mezi „nikoho nenavrhuje" a „ještě neodevzdal".
- Do rady jdou **dva s nejvíc nominacemi.** Když nikdo nikoho nenominuje,
  rada se přeskočí a to kolo nikdo neodejde.
- **Odchází jen ten, kdo má nadpoloviční většinu odevzdaných hlasů a
  nejméně dva.** Při remíze nikdo. Kolo bez vyhoštění je normální výsledek.
- Hlasy jsou veřejné. Po radě aplikace ukáže, kdo koho volil. Výjimkou je
  tma z noci.
- **Stín** má jeden hlas na celý zbytek hry. Když ho v radě použije, je
  nadobro utracený, i když rada skončí bez vyhoštění. Zdržením se neutratí.
  Nominovat stín nemůže a nominován být nemůže.

## 10. Kolik vás je

| Hráčů | Sabotérů | Limit šicht |
|---|---|---|
| 5 | 1 | 3 |
| 6 | 2 | 4 |
| 7 | 2 | 3 |
| 8 | 2 | 3 |
| 9 | 3 | 6 |
| 10 | 3 | 5 |
| 11 | 3 | 5 |
| 12 | 4 | 7 |

Čísla jsou výsledek simulace tisíců partií, ne odhad. Parta na šichtu je
vždy zhruba půlka živých a nikdy celý stůl. Při 8 živých jdou 4, při 5
živých 3, při 3 živých 2.

**Pětka je tréninková partie.** Kazí jen jeden a stůl ho může najít hned.
Hodí se na naučení, ne na hodnocení, kdo je lepší. Šest je první velikost,
kde se hra pořádně rozjede. Nad dvanáct se nehraje: volná rozprava se
u větších stolů rozpadá.

## 11. Etiketa u stolu

Tohle nejsou pravidla v aplikaci, tohle si hlídáte sami.

- **Telefon je jen tvůj.** Nikomu ho nepůjčuj, nikomu nekoukej přes rameno.
- **Během rozpravy lícem dolů.** Obrazovka stejně ukazuje jen odpočet.
- **Sahej na telefon v každé fázi**, i když nemáš co dělat. Kdo si telefon
  vezme jen tehdy, když je v partě nebo když je noc, prozradí se.
- **Nekoukej, jak dlouho kdo kouká.** A nedávej ostatním důvod to dělat.
- **Stíny mluví.** Vyřazený hráč sedí u stolu dál a hádá se dál. „Já byl
  pracant, věřte mi" je platný argument, jen si pamatuj, že totéž říkají
  i vyřazení sabotéři.
- **Nic se neukazuje.** Ukázat někomu obrazovku s rolí nebo se šeptandou
  hru zabije. Kdo to udělá, hraje příště za sabotéra.

## 12. Praktické věci

**Nastavení hry.** Mění se jen v šatně, po rozdání rolí už ne.

| Volba | Výchozí | Co dělá |
|---|---|---|
| Šeptanda pro všechny | zapnuto | Vypnuto: sabotér větu nedostane a musí si vymyslet i to, že nějakou má. Ostřejší varianta. |
| Noční vraždy | zapnuto | Vypnuto: odchází se jen vyhoštěním. Delší hra, častěji dojde na limit šicht. |

**Přehled a zápisník.** Na tlačítkách vlevo a vpravo dole. Přehled ukazuje
historii šicht, kdo byl v partě, jak dopadly rady, a připomene ti tvou roli.
Zápisník je jen tvůj, zůstává jen v tvém telefonu a nikam se neposílá.
Oboje je během rozpravy zamčené.

**Vypadlo spojení.** Když někomu, na koho se čeká, vypadne internet nebo
zhasne displej, hra se pro všechny zastaví a odpočet stojí. Jakmile se vrátí,
pokračuje se od stejné vteřiny. Zakladatel může rozhodnout, že se hraje bez
něj: jeho volba propadne, jako by nic neodevzdal, a až se vrátí, hraje
normálně dál.

**Obnovení stránky.** Když omylem zavřeš kartu nebo obnovíš stránku,
aplikace tě do tří hodin vrátí do rozehrané šichty.

**Nedá se dohrát.** Někdo odešel od stolu, dochází čas. Zakladatel může
šichtu ukončit pro všechny: z pauzy, nebo z přehledu hry pod nadpisem „Když
se nedá dohrát". Je to na dvě ťuknutí. Konec je bez vítěze, role se odhalí
stejně jako po každém konci a jde se rovnou na další partii. Kdo není
zakladatel, může ze šichty odejít sám. Na úvodní obrazovce jde rozehraná
partie zahodit.

**Konec partie.** Aplikace řekne, kdo vyhrál a proč. Pak KDO BYL KDO ukáže
role všech, kdy kdo odešel, a cenu Nejlepší čuch. PRŮBĚH ukáže celou partii
kolo po kole. JEŠTĚ JEDNOU vrátí stejnou partu do šatny s novými rolemi.

**Na jednom telefonu.** Volba JEN NA JEDNOM TELEFONU na úvodu spustí režim,
kde se telefon podává dokola a aplikace říká, kdo ho má vzít. Hodí se na
vyzkoušení pravidel nebo když někomu telefon chybí. Pořádně se hraje online.

**Zvuk.** V pravidlech je přepínač. Houkačku pouští telefon zakladatele,
vibrace má každý svoje, iPhone ji neumí.

## 13. Tipy

**Pracant.** Padlá šichta říká, kdo je podezřelý, prošlá říká, kdo je asi
čistý. Kdo byl ve dvou prošlých partách, je nadějný. Kdo byl ve dvou
padlých, ne. Šeptandu říkej nahlas a hned, dokud ji máš čerstvou. Sleduj,
kdo utíná rozpravu a kdo se zdržuje hlasování. A pamatuj na limit: kolo bez
vyhoštění je kolo pro sabotéry.

**Sabotér.** Nekaz pokaždé. Prošlá šichta, ve které jsi byl, je tvé nejlepší
alibi, a k tomu dostaneš šeptandu, kterou si můžeš přizpůsobit. Dvě sabotáže
v jedné partě jsou katastrofa: stůl ví, že jste oba mezi těmi čtyřmi. Dívej
se, kdo ze sabotérů je v partě s tebou, a odhadni, jestli to zmáčkne on.
Domluvit se nemůžete, sedíte mezi pracanty.

**Předák.** Vražda není vždy nejlepší. Tma nad radou, kde se stůl chystá
vyhostit tvého parťáka, ho zachrání. Imunita pro nevinného pracanta udělá
z pracanta podezřelého. A ber vraždu, když ji máš, protože příští kolo mít
nepůjde.

**Všichni.** Hra se hraje nahlas. Kdo celou rozpravu mlčí, nikomu nepomůže
a všem je podezřelý.

## 14. Časté otázky

**Jsem pracant a omylem jsem ťukl KAZIT.** Nic se nestalo. Pracant kazit
neumí, tlačítko jen vypadá stejně pro všechny.

**Nikdo nikoho nenominoval.** Rada se přeskočí a nikdo neodejde. Je to
platný výsledek, ne chyba.

**Dva kandidáti mají stejně hlasů.** Nikdo neodejde.

**Kandidát má tři hlasy z osmi.** Neodejde. Potřebuje nadpoloviční většinu
odevzdaných hlasů, tedy víc než polovinu těch, kdo hlasovali, a nejméně dva.

**Předák umřel.** Předákem je od té chvíle další žijící sabotér. Sabotéři
to vidí na své obrazovce, stůl ne.

**Vzali imunitu a nikdo neumřel. Proč?** Buď chtěli chránit parťáka, nebo
hodit podezření na nevinného. To je otázka do rozpravy.

**Šichta prošla, ale v partě sabotér byl. Jak?** Nekazil. Sabotér kazit
nemusí. Šeptanda o tichém sabotérovi právě tohle prozrazuje.

**Stín se zdržel hlasování. Má ještě hlas?** Ano. Hlas se utratí jen
hlasováním pro někoho.

**Chci hru s víc než dvanácti lidmi.** Nejde to. Rozprava u větších stolů
nefunguje bez moderátora. Rozdělte se na dva stoly.

## 15. Slovníček

| Slovo | Význam |
|---|---|
| **Šichta** | Jedno kolo. Taky název hry. |
| **Parta** | Hráči vylosovaní na šichtu. Zhruba půlka živých. |
| **Makat / kazit** | Tajná volba člena party. Kazit umí jen sabotér. |
| **Padla / prošla** | Šichta padla, když aspoň jeden kazil. Jinak prošla. |
| **Šeptanda** | Vlastní pravdivá věta za prošlou šichtu. |
| **Rozprava** | Volná diskuze bez telefonů. |
| **Nominace, rada** | Tajný návrh kandidátů, pak veřejné hlasování mezi nimi. |
| **Vyhoštění** | Odchod po hlasování. Odhalí se role. |
| **Noc** | Po padlé šichtě. Předák vybírá odměnu, ostatní tipují podezřelého. |
| **Předák** | Sabotér, který v noci rozhoduje. |
| **Stín** | Vyřazený hráč. Mluví, nehraje, má jeden hlas. |
| **Limit šicht** | Kolik kol má stůl na to, aby sabotéry našel. |
| **Zakladatel** | Kdo šichtu založil. Startuje hru, řeší výpadky, může ukončit. |
