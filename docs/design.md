# Šichta — herní design

**Stav:** v1 podle kódu v `src/game/`, 2026-09-20 · **Název:** Šichta (EN: *Shift*) · **Týmy:** Pracanti vs. Sabotéři
**Formát:** fyzická společenská hra pro 5–12 lidí v jedné místnosti, řízená PWA na telefonech hráčů. Bez vypravěče.
**Délka partie:** 25–30 min (5–7 hráčů) · 45–60 min (8–12) · **Stack:** Vite PWA + Cloudflare Durable Objects (jeden worker servíruje appku i drží stav) · **Repo slug:** `sichta`

---

## 1. Co to je

Sociální dedukční hra u stolu. Část party jsou tajní **Sabotéři**. Každé kolo jde vybraná parta na **šichtu** — sabotéři ji můžou tajně pokazit. Pokud šichta selže, sabotéři si tu noc smí někoho odstranit. Pokud projde, každý dostane vlastní pravdivou **šeptandu**, kterou si ostatní nemůžou ověřit. Mezi tím se sedí u stolu a hádá se.

Aplikace nahrazuje vypravěče: rozdá role, hlídá fáze, ukazuje každému přesně to, co smí vidět, a spočítá výsledky. Nikdo není mimo hru.

**Zdroj napětí:** sabotáž je jediná cesta sabotérů k vraždě — ale každá sabotáž zároveň prozradí, že mezi tou partou na šichtě někdo je.

---

## 2. Designové principy (neporušitelné)

1. **Diskuze je hra, mechaniky jsou palivo.** Každá mechanika se poměřuje tím, kolik vyvolá hádky u stolu. Mechanika, která se vyřeší v hlavě jednoho hráče, je špatná mechanika.
2. **Žádný mechanismus nesmí dát důkaz. Jen podezření.** Z jedné partie nesmí jít spočítat, kdo jsou sabotéři. Kdykoliv stojíme před volbou "přesnější info vs. mlhavější", bereme mlhavější — pokud tím nezmizí rozhodování sabotérů (viz 3.3).
3. **Telefon je v ruce jen ve fázích, kde má být.** Během rozpravy ukazuje aplikace jen timer a lidi mají mobily obrácené. Vynucuje se UI a zvukem, ne pravidlem v README.
4. **Nikdo nekouká, jak hrají ostatní.** Každý hráč sahá na telefon v každé telefonní fázi, i když nemá co dělat. Doba koukání do displeje nesmí nic prozradit.
5. **Nikdo neodpadne ze stolu.** Vyřazený hráč dál mluví. Ztrácí moc, ne přítomnost.
6. **Žádné další role.** Jen Pracant a Sabotér (+ Předák jako jeden z nich). Asymetrie pochází z mechanik, ne z kartiček rolí.
7. **Pravidlo jedné věty.** Cokoliv, co se nedá vysvětlit jednou větou bez výjimek, se do hry nedostane.

---

## 3. v1 — kompletní pravidla

### 3.1 Sestava

*Čísla drží `src/game/rules.ts` a tahle tabulka je z něj opsaná. Jsou výsledek simulace (§9), ne odhad: přeměřeno 2026-09-20 na jednu směnu za kolo a strop tří pravd v šeptandě. Sloupec Bot je výhra bota-pracanta, pásmo 35–60 % je použitelné. Poslední sloupec je podíl partií, které skončí vyčerpáním limitu šicht.*

| Hráčů | Sabotérů | Limit šicht | Bot | Limit padne |
|---|---|---|---|---|
| 5 | 1 | 3 | neměřitelné | |
| 6 | 2 | 4 | 48 % | 6 % |
| 7 | 2 | 3 | 46 % | 33 % |
| 8 | 2 | 3 | 44 % | 54 % |
| 9 | 3 | 6 | 40 % | 3 % |
| 10 | 3 | 5 | 47 % | 20 % |
| 11 | 3 | 5 | 46 % | 33 % |
| 12 | 4 | 7 | 38 % | 6 % |

**Jedna směna za kolo pro všechny stoly.** Dvě směny (§3.2.2) zůstávají v kódu jako experiment, žádná sestava je nepoužívá. Tempo úbytku drží nabídka odměn (§3.2.1) a to, že vražda nejde dvě kola po sobě.

**Páka je délka hry, ne počet sabotérů.** U malého stolu při limitu 5 vyhrávají pracanti přes dvě třetiny partií a je to nuda; při limitu 3 to sedí. Málo kol znamená, že si pracanti nemůžou dovolit jedno promarněné vyhoštění, a přesně ten tlak dělá malý stůl zajímavým.

**Čtyři hráči jsou nehratelní.** V celé prohledané mřížce (sabotéři × limit × šeptanda × směny) neexistuje jediná konfigurace v pásmu. Tři pracanti proti jednomu sabotérovi je hádání, ne dedukce.

**Pětka je tréninková partie.** S pěti hráči a jedním sabotérem existuje jen pět možných světů, bot je nevyřeší jako strop, ale jako rovnici, a jeho čísla o skutečném stole nevypovídají nic. Se dvěma sabotéry se po první vraždě stojí dva na dva a sabotéři ovládnou hlasování, proto kazí jen jeden. Šeptanda mu při pěti nedává větu „určitě není sabotér“, jinak by partii vyřešila za dvě kola. Aplikace to v šatně řekne dopředu. Tohle chce playtest, ne další simulaci.

**Šest je první velikost, kde se hra pořádně rozjede.**

#### Proč to končí u dvanácti

Odsimuloval jsem i větší stoly (§9, sekce 15):

| Hráčů | Sabotérů | Parta | Výhra bota-pracanta |
|---|---|---|---|
| 12 | 4 | 6 | 49,7 % |
| 14 | 5 | 7 | 33,7 % |
| 16 | 5 | 8 | 39,7 % |
| 18 | 6 | 9 | 32,0 % |
| 20 | 7 | 10 | 29,3 % |

**Mechanicky to drží zhruba do šestnácti.** Pak se to láme, protože parta na
šichtu je polovina stolu: při dvaceti hráčích padlá šichta ukáže na deset lidí,
což už skoro není informace.

**Skutečná hranice je ale jinde a je sociální.** Čtyřminutová rozprava dělí
dvaceti lidem dvanáct vteřin na hlavu. Televizní Zrádci mají přes dvacet lidí,
ale mají taky moderátora, který rozdává slovo, a stříhaný záznam. U stolu se
volná rozprava rozpadá někde kolem dvanácti.

Dvanáct je proto **hranice volné rozpravy, ne hranice technická ani mechanická.**
Nad ní by hra potřebovala řízenou rozpravu, kde každý dostane pevný slot jako
na obrazovce Poslední slovo. To je samostatná funkce, ne parametr, a do v1 nepatří.

**Počet sabotérů je vždy veřejný.** Bez toho umře polovina dedukce ("tihle tři jsou čistí, takže…"). Randomizace patří **mezi** partie, ne dovnitř jedné.

**Velikost party na šichtu je dynamická:** `min( ceil(živých / 2), živých − 1 )`. Při 8 živých to jsou 4, při 5 živých 3, při 3 živých 2. Parta se s ubývajícím stolem zmenšuje a **nikdy nejde celý živý stůl**, což by z počtu sabotáží udělalo úplnou informaci.

Parta je zhruba půl stolu záměrně. Kdyby byla malá, selhaná šichta by usvědčovala. Při 4 z 8 jen podezírá.

### 3.2 Průběh kola (jedna šichta)

Kolo má 8 fází. Časy jsou pro 8 hráčů.

| # | Fáze | Čas | Telefon | Co se děje |
|---|------|-----|---------|------------|
| 1 | **Zadání** | 15 s | v ruce | Aplikace **veřejně** vylosuje partu na šichtu. Kdo je v partě, ví celý stůl — navždy, v historii. |
| 2 | **Šichta** | 45 s | v ruce | Každý člen party tajně mačká **MAKAT** / **KAZIT**. Pracantovi je tlačítko KAZIT zašedlé — "omylem jsem sabotoval" nesmí existovat. Sabotér vidí **jmenovitě, kdo ze sabotérů jde na šichtu s ním**. |
| 3 | **Výsledek** | 22 s | dolů | "Šichta prošla" / "Šichta padla, kazili **2**". Počet sabotáží se ukazuje. Delší schválně: je to jediný tvrdý důkaz v kole a musí se zapamatovat. |
| 4 | **Šeptanda** | 20 s | v ruce | Jen když šichta prošla. **Každý dostane vlastní pravdivou větu**, nikdo si cizí neověří (viz 3.5). |
| 5 | **Rozprava** | 3 až 5 min | **DOLŮ** | Mluví se. Aplikace ukazuje jen velký odpočet. Přehled historie je během rozpravy zamčený: kdo chce vědět, kdo byl na které šichtě, ptá se nahlas. Nadpoloviční většina živých může rozpravu utnout. |
| 6 | **Nominace** | 60 s | v ruce | Všichni najednou tajně nominují jednoho hráče, nebo nikoho. Do rady jdou dva s nejvíc nominacemi (při remíze na druhém místě všichni). Kdo má z noci imunitu, do rady nejde. Stíny nenominují. |
| 7 | **Rada** | 45 s | v ruce | Nejdřív dostane každý kandidát poslední slovo (30 s, při třech a víc 20 s). Pak se hlasuje mezi nominovanými, zdržet se je taky tah. **Aplikace pak veřejně ukáže, kdo koho volil.** Odchází jen ten, kdo má nadpoloviční většinu odevzdaných hlasů a nejméně dva. Jinak nikdo (a to je tlak). |
| 8 | **Noc** | 60 s | v ruce | Jen když šichta padla: **Předák vybere odměnu** (viz 3.2.1); u vraždy sabotéři navrhnou oběť a Předák rozhodne (viz 3.4). Všichni ostatní zároveň zapisují svého hlavního podezřelého — sčítá se do ceny "Nejlepší čuch". Fáze trvá stejně dlouho, i když nikdo neumírá. |

**Časy jsou stropy, ne normy.** Fáze, ve které odevzdali všichni, na které se čeká, skončí do dvou vteřin. Kdo se odpojí uprostřed fáze, kde se od něj něco čeká, hru zastaví; zakladatel může rozhodnout, že se hraje bez něj.

**Vyhoštěnému se veřejně odhalí role.** Bez odhalení se parta nikdy nenaučí hrát a nezažije ten moment.

### 3.2.1 Nabídka odměn — co sabotéři dostanou za padlou šichtu

Padlá šichta **neznamená automaticky vraždu.** Předák si vybere jednu ze tří odměn:

| Odměna | Efekt |
|--------|-------|
| **Vražda** | Jeden hráč dnes v noci končí. |
| **Imunita** | Kdokoliv podle vlastní volby — i pracant — nemůže být v nejbližší radě vyhoštěn. |
| **Tma** | U nejbližší rady se neukáže, kdo koho volil. |

Proč zrovna takhle: bez toho umírali dva lidé za kolo a partie skončila vybitím stolu po 3,6 kolech, dřív než stihla dospět. Zvažoval jsem místo toho cooldown ("vraždit smí jen každou druhou noc"), ale to je účetnictví napříč koly a v kole bez vraždy mizí důvod sabotovat. **Nabídka odměn dělá totéž pro tempo a je z toho přitom rozhodnutí:** simulace dává 42,3 % výher pracantů oproti 41,6 % u cooldownu při 8 hráčích a delší partie.

Navíc je každá z těch tří tempem jinam. **Tma** je proti stolu, jehož hlavní důkaz je hlasovací záznam, mimořádně tvrdá. **Imunita** umožňuje hodit to na nevinného. A samotná volba je informace — *vzali imunitu, proč zrovna teď?*

**Vražda nejde dvě kola po sobě.** Počítá se v kolech, ne v nocích: prošlá šichta mezi dvěma vraždami stačí, přesně tak to měřila simulace. Aplikace tlačítko po vraždě prostě zašedne. Tím padá poslední námitka proti cooldownu — není co si pamatovat, hráč vidí, co smí, a rozhoduje se jen mezi tím, co je na obrazovce.

**Všichni sabotéři vidí, co Předák vybral.** Jsou tým, nemá smysl to před nimi tajit — a v režimu *Tajný sabotér* (§6.1) je právě tohle ta obrazovka, kde falešní sabotéři poprvé zapochybují.

**Imunitu i tmu se stůl dozví ráno.** Skrytá imunita by se stejně prozradila tím, že nominovaný nepostoupí do rady; veřejná je tah do rozpravy (*proč zrovna Klára?*). Tma se pozná tím, že nikdo neumřel a nikdo nemá imunitu, tak ji ráno rovnou řekneme.

> Aby nabídka fungovala, musí být alternativy **opravdu lákavé**. Kdyby sabotéři brali vraždu pokaždé (a mohli), jsme zpátky na 31 % a tempo je rozbité. Je to první věc ke sledování při playtestu.

### 3.2.2 Dvě směny — dopolední a odpolední (experiment, ve v1 vypnuto)

> **Stav 2026-09-20:** kód dvě směny umí, ale žádná sestava je nepoužívá. Bez odměny za padlou dopolední směnu jsou jen druhou stopou zdarma pro pracanty a stojí přes minutu telefonu v ruce navíc. Tempo úbytku drží nabídka odměn a cooldown vražd. Zapnou se, až playtest s 9 a víc hráči ukáže, že stolu chybí stopy, a to i s dopolední odměnou. Zbytek téhle sekce popisuje původní záměr.

Při osmi a víc hráčích má kolo **dvě šichty** místo jedné, každou s vlastní partou:

- **Dopolední** — padne-li, Předák vybírá jen z *Imunity* a *Tmy*.
- **Odpolední** — padne-li, je v nabídce i *Vražda*.

Pak teprve přijde jedna rozprava, jedna rada a jedna noc. **Kolo má dvě sady důkazů, ale pořád jen jedno vyhoštění a nejvýš jednu vraždu.**

Proč to je dobré:

1. **Zdvojnásobí to množství tvrdých stop, aniž by to zrychlilo úbytek.** To byl původně hlavní problém — při čtyřech kolech měli pracanti jen čtyři datové body na celou partii.
2. **Strop jedné vraždy za kolo vzniká strukturálně**, ne pravidlem. Nic se nepočítá napříč koly.
3. Simulace: při 8 hráčích a 3 sabotérech posun z 41,1 % na **46,7 %**, při 9 z 50,3 % na 55,5 %.

**Při 5–7 hráčích se dvě směny nepoužívají.** Tam pracanti vyhrávají i tak moc a další důkazy by to jen zhoršily.

> **Cena, kterou to má:** dvě směny znamenají zhruba dvě minuty telefonu navíc na kolo, a to jde proti principu #3. Jestli za +5 bodů vyvážení stojí delší kolo, simulace nerozhodne — pozná se to jedině u stolu.

### 3.3 Sabotáž a koordinace sabotérů

Počet sabotáží se **ukazuje**. Je to jediné vědomé porušení principu #2 a má dobrý důvod: bez něj by sabotéři kazili bez rozmyslu. S ním musí každé kolo řešit vězňovo dilema — *kazím já, nebo to nechám na něm?* Dvě sabotáže v jedné partě je pro ně katastrofa (stůl ví, že jsou oba mezi těmi čtyřmi), nula sabotáží znamená žádnou odměnu.

Pořád to není důkaz. "Oba jsou mezi těmi čtyřmi" je šest kombinací, ne jedna.

**Sabotéři se od začátku znají jmenovitě.** Informovaná menšina je to, čím celý žánr vyrovnává, že je jich míň — Palermo, Avalon, Zrádci, všude. Bez toho by byli jen slabší pracanti.

**Dilema tím ale nemizí, jen se zlepší.** Vidíš, kdo jde na šichtu s tebou — ale během té 45sekundové fáze se s ním nedomluvíš, sedíte u stolu mezi pracanty. Otázka "zmáčkne to taky *on*?" je lepší než "kolik nás tu je", protože na konkrétního člověka se dá mít odhad. Občasná dvojitá sabotáž nebo naopak promarněné kolo jsou nejlepší momenty, co hra vyrobí.

**Koordinační kanál (v1.2):** v noční fázi dostanou sabotéři obrazovku **Domluva**, kde si na příští šichtu odhlasují konvenci — *kazí jen Předák · kazí ten s nižším číslem · nekazíme*. Aplikace ji příští kolo připomene. Je to app-native způsob, jak se domluvit bez mluvení u stolu, a stojí to jednu obrazovku.

### 3.4 Předák

Jeden ze sabotérů je **Předák**. Ostatní sabotéři to vědí, stůl ne.

- V noci **sabotéři navrhují**, koho odstranit, a to klidně dřív, než Předák vybere odměnu. Předák vidí návrhy u jmen a rozhodne, jestli je poslechne, nebo zabije podle sebe. Žádné losování při shodě — jeden člověk vlastní to rozhodnutí.
- Ostatní sabotéři **vidí, že přehlasoval**, ale v režimu *Tajný sabotér* (§6.1) nevědí proč. Tohle je jediný kus mechaniky, který ten režim potřebuje — proto ho v1 zavádí, i když ho sama nevyužije.
- Když Předák zemře nebo je vyhoštěn, funkce přechází na dalšího žijícího sabotéra (pořadí podle sedadla, aplikace to ví předem).
- **Hook pro v3:** v režimu *Tajný sabotér* je Předák jediný pravý sabotér — ostatní si jen myslí, že sabotéři jsou. V tom režimu se označení "Předák" nikomu nezobrazuje, aby to neprozradilo.

### 3.5 Šeptanda

Odměna pracantů za úspěšnou šichtu. **Každý živý hráč dostane vlastní větu.**

Proč každý svou a ne jednu veřejnou: veřejná hláška je oznámení, které si všichni
přečtou stejně, a stůl o ní nemá co říct. Vlastní věta je naopak **příspěvek do
rozpravy, který nikdo nemůže ověřit.** Sabotér si tu svou může vymyslet, pracant
tu svou musí obhájit. Tohle je druhá polovina lhaní ve hře, hned vedle tajné
volby na šichtě.

Rodiny tvrzení, všechny vždy pravdivé:

| Rodina | Tvar | Váha |
|---|---|---|
| dvojice | "Aspoň jeden z téhle dvojice je pracant: A, B." | 4 |
| trojice čistá | "Aspoň jeden z téhle trojice je pracant: A, B, C." | 3 |
| trojice špinavá | "Aspoň jeden z téhle trojice je sabotér: A, B, C." | 4 |
| čistý | "Určitě není sabotér: A." | 1 |
| nominace | "V kole N nominoval právě jeden sabotér." | 3 |
| hlas | "V kole N padl hlas aspoň jednoho sabotéra na: A." | 3 |
| předák | "V kole N byl předák v partě na šichtě." | 2 |
| tichý sabotér | "Šichta v kole N prošla, a přesto v ní sabotér byl." | 3 |

Čtyři pravidla, která se nesmí porušit:

1. **Každá věta je pravdivá.** Tvrzení se staví jako data a teprve pak překládá
   do češtiny. Pravdivost posuzuje samostatná funkce, která čte stav znovu a od
   nuly, takže testy křížově kontrolují výběr, ne samy sebe.
2. **Každý dostane právě jednu.** Nikdo nesmí zůstat s prázdnou. "Já nic
   nedostal" je u stolu okamžitě podezřelé a rozprava se zvrhne na výslech.
3. **Sabotér dostává věty ze stejného pytle.** Kdyby měly jiný tvar, dalo by se
   lhaní odhalit podle stylu. Sabotérovi jsou k ničemu, protože role už zná,
   takže musí lhát nebo mlčet. To je záměr.
4. **Nic o probíhajícím kole.** Šeptanda běží před nominacemi a radou. Tvrzení
   o hlasování se smí týkat jen kol, která doběhla. Dřív to bylo špatně a po
   první šichtě to hlásilo "aspoň jeden sabotér nenominoval", což byla pravda
   jen proto, že ještě nikdo nenominoval.

5. **Žádná věta není důkaz.** Hlasy v radě jsou veřejné, takže věta „hlas
   sabotéra padl na X“ by jmenovala sabotéra rovnou, když X dostal jediný
   hlas. Vybírají se proto jen cíle se dvěma a víc hlasy. Věta o předákovi se
   s veřejnými partami protíná napříč koly, proto padne nejvýš jednou za
   partii. Vlastní jméno ve vlastní větě se nerozdává, když je jiná pravda
   po ruce.

**Zakázaný typ šeptandy:** cokoliv ve tvaru "mezi A, B, C je právě jeden
sabotér". To je zadání logické úlohy, ne pomluva.

**Dvě shodné věty jsou v pořádku.** Když dva lidi dostanou totéž, je to
potvrzení, ne chyba. Zároveň je to past na toho, kdo si větu vymýšlí.

**Strop tří pravd.** Za prošlou šichtu vzniknou nejvýš **tři různé věty**,
které se rozdají mezi všechny živé hráče. Kdyby měl každý vlastní nezávislou
pravdu, roste informace s počtem lidí, zatímco počet sabotérů ne, a u dvanácti
hráčů pak vyhrávají pracanti tři partie ze čtyř (změřeno: 62 % proti 26 %).
Tři pravdy drží informaci konstantní bez ohledu na velikost stolu.

Vedlejší efekt je výhoda, ne kompromis: u většího stolu **dostane několik lidí
tutéž větu**. Dva lidi se stejnou větou se navzájem potvrzují a ten, kdo si
větu vymýšlí, hraje ruletu, jestli netrefí cizí.

### 3.5b Zkrácení rozpravy

Odpočet rozpravy je strop, ne norma. **Nadpoloviční většina živých ho může
utnout.** Kdo už chce dál, je veřejně vidět: je to nátlak sám o sobě a zároveň
informace do hry, protože kdo pořád spěchá pryč od rozpravy, si jí možná moc
nepřeje. Odvolat to jde, dokud většina nepadne.

### 3.5c Nominovat nikoho a zdržet se

Obojí je **plnohodnotný tah, ne nečinnost.** Stůl musí poznat rozdíl mezi
"rozhodl se nikoho nenavrhnout" a "ještě neodevzdal", jinak se na člověka
čeká a počty odevzdaných lžou.

Když nenominuje nikdo, to kolo nikdo neodejde. Stejně tak při rovnosti hlasů.
Kolo bez vyhoštění je legitimní výsledek, ne zaseknutá hra.

Bez tohohle by musel každý někoho navrhnout, což zaprvé nutí lidi střílet
naslepo a zadruhé rozbíjí šeptandu: věta "v kole 2 nominoval právě jeden
sabotér" neříká nic, když museli nominovat všichni.

Stín, který se zdrží, svůj jediný hlas neutratí.

### 3.5d Zápisník

Každý má vlastní a nikdo jiný do něj nevidí. Drží se **jen v prohlížeči toho
telefonu, nikdy na serveru**: je to soukromá poznámka a co se neposílá,
nemůže uniknout. Na jednom telefonu se klíčuje podle toho, kdo ho zrovna drží.

### 3.5e Nastavení hry

Mění se jen v šatně, po rozdání rolí už ne. Měnit pravidla za běhu je
nejrychlejší způsob, jak partu naštvat.

| Volba | Výchozí | Co dělá |
|---|---|---|
| Šeptanda pro všechny | zapnuto | Vypnuto je špionská varianta: sabotér nedostane větu a musí si vymyslet i to, že nějakou má. Ostřejší, ale stačí jednou zaváhat. |
| Noční vraždy | zapnuté | Vypnuto se odchází jen vyhoštěním. Hra je delší, zůstane víc lidí a častěji dojde na limit šicht. Hodí se k vypnuté šeptandě pro sabotéry. |

### 3.6 Stíny (vyřazení hráči)

Vyřazený zůstává sedět u stolu a:

- **mluví úplně normálně** dál, celou zbývající hru
- **nesmí nominovat** a **nesmí být nominován**
- **nechodí na šichty**
- má **jeden jediný hlas na celý zbytek hry** — kdykoliv ho v radě použije, je nadobro pryč, i když rada skončí bez vyhoštění. Zdržet se ho neutratí.

Model z Blood on the Clocktower, léty prověřený. Únik informací ("já jsem byl pracant, věřte mi") je vyvážený tím, že mezi Stíny jsou i sabotéři, kteří tvrdí totéž.

**Hlasy Stínů jsou nosná mechanika, ne dekorace** — viz 3.7. Jejich vzácnost (jeden na hráče, navždy) je nutí řešit, *kdy* je utratit.

> **Varianta "Umlčení"** (kratší, měkčí hra): první zásah znamená jedno kolo ticha, pak návrat; druhý je definitivní. Parametr v nastavení místnosti.

### 3.7 Konec hry — bez parity

- **Pracanti vyhrají**, jakmile je vyhoštěn poslední sabotér.
- **Sabotéři vyhrají**, když doběhne limit šicht a aspoň jeden sabotér žije — **nebo** když nezůstane žádný živý pracant.

**Žádné pravidlo parity.** Původní návrh (sabotéři vyhrají při rovnosti živých) končil hru po dvou kolech: dvě špatná vyhoštění + dvě vraždy = 2v2 a konec. Dvě diskuze na celou partii.

Parita tady není potřeba, protože **hlasy Stínů drží hru živou i v beznadějné situaci.** Při 1 žijícím pracantovi proti 2 sabotérům má stůl pořád pět nevyužitých hlasů stínů — vyhoštění je stále možné. Pozdní hra se tím stane nejdramatičtější částí místo formality.

Limit šicht je jediné, co pracanty tlačí. Hoří jim termín, a proto dělají ukvapená rozhodnutí. Ta ukvapená rozhodnutí jsou hra.

> **Tohle je číslo jedna na seznamu věcí k odsimulování** (viz §9). Limit šicht v 3.1 je odhad, ne výsledek.

### 3.8 Co ve v1 vědomě NENÍ

Ekonomika, banka, upgrady, minihry, imunity, tajný sabotér. Nic z toho.

---

## 4. v1.1 / v1.2 — první přírůstky

**v1.1 — Mistr vybírá partu** *(přepínač v nastavení místnosti, defaultně vypnutý)*
Místo losu vybírá partu na šichtu **Mistr** — funkce se posouvá po stole. Jedna obrazovka, 45 s fáze navíc, a obrovský zdroj hádky: *proč jsi tam dal sebe? proč jsi vynechal Kláru?* Nejlepší poměr přidané diskuze k práci v celém projektu.

*(Avalonovo schvalovací hlasování o partě vědomě nepřebíráme — zdržuje a nudí.)*

**v1.2 — Domluva sabotérů** (viz 3.3)

---

## 5. v2 — šichty jako skutečné minihry + banka

### 5.1 Střípkové minihry

**Aplikace dá každému členovi party tajný střípek informace a parta z něj musí nahlas složit jednu společnou odpověď.** Sabotér o svém střípku lže.

Proč zrovna tahle rodina:

- Sabotáž = **lež o něčem konkrétním, co bylo řečeno nahlas**. Zůstane po ní stopa v paměti stolu.
- Po odevzdání aplikace ohlásí **správnou odpověď** — a stůl začne rekonstruovat, čí číslo nesedělo.
- Sabotér má vždy obhajobu ("říkal jsem dvanáct, ty jsi slyšel devatenáct"), takže to zůstane hádka, ne důkaz.

**Aplikace nikdy neodhalí, kdo měl jaký střípek.** Jen správnou odpověď. Nepřekročitelné — s odhalením střípků je z toho usvědčovací nástroj a princip #2 padá.

**Kdo odpověď zadá (zapisovatel):**
Aplikace vylosuje z party **zapisovatele**. Ten zadá odpověď, na kterou se parta nahlas shodla — a **aplikace ji před uzamčením 10 sekund veřejně zobrazí celému stolu**. Tím je pozice zapisovatele neškodná: nemůže nic přepsat, protože to všichni vidí, a "to jsme neřekli!" je samo o sobě dobrý moment u stolu.

*Zvažovali jsme hlasování o zapisovateli, ale veřejné zobrazení tu pozici zneškodní, takže by z hlasování bylo divadlo bez sázky — a stálo by 30 s každé kolo. Losem.*

Hry v pořadí k implementaci:

1. **Součet** — každý dostane číslo, parta musí nahlas říct součet. (Nejjednodušší, postav první.)
2. **Pořadí** — každý dostane jeden fakt o pěti věcech, parta je musí seřadit.
3. **Řetěz** — každý dostane slovo, parta z nich musí postavit smysluplnou větu.
4. **Souřadnice** — každý dostane část souřadnice, parta musí trefit místo na mapě.

Šichta má pak dvě vrstvy: minihra dělá **drama a alibi**, tajné tlačítko MAKAT/KAZIT pod tím drží **tvrdý výsledek**. Kvalita provedení určuje **výplatu do banky**.

### 5.2 Banka a upgrady

- Úspěšná šichta → částka do sdílené **banky** (podle výkonu v minihře).
- Padlá šichta → nula, a sabotéři mají vraždu.
- Konec: vyhrají-li pracanti, banka je jejich skóre. Vyhrají-li sabotéři, berou ji oni.

**Maximálně tři upgrady. Každý jednou větou. Kupuje se hlasováním celého stolu** — sabotéři musí nenápadně lobovat proti tomu užitečnému.

| Upgrade | Osa | Efekt |
|---------|-----|-------|
| **Kontrola** | informace | U nejbližší šichty se ukáže, **kolik sabotérů v partě bylo** — ne kolik jich kazilo. |
| **Pojistka** | obrana | Nejbližší noční vraždu aplikace zruší. |
| **Dvojitá rada** | útok | V nejbližší radě se vyhostí dva lidé místo jednoho. |

Víc jich nebude. Každý je na jiné ose, takže nákup je vždycky skutečná volba.

**Kontrola je z nich nejsilnější** a je to záměr — odhalí rozdíl mezi „kolik kazilo" a „kolik jich tam bylo". Když šichta prošla, ale byli v ní dva sabotéři, stůl se dozví, že se oba schválně drželi zpátky. To je informace, kterou jinak nikdy nezíská.

> **Vyřazeno: „Přesčas" (+1 kolo k limitu).** Bez pravidla parity je limit šicht jediná cesta sabotérů k výhře, takže upgrade, který ho posouvá, by byl vždycky správný nákup. Upgrade, který se kupuje vždycky, není rozhodnutí.

---

## 6. v3 — koření pro ostřílenou partu

Všechno níž je **přepínač v nastavení místnosti**, nikdy ne výchozí stav.

### 6.1 Tajný sabotér
Sabotérů je víc, ale **jen Předák je pravý** — ostatní to nevědí. Falešní chodí na noční poradu a navrhují oběť, ale zásah provádí (nebo neprovádí) Předák. Při vyhoštění se falešnému odhalí role "Sabotér", takže si stůl myslí, že má hotovo — a vraždění pokračuje.

**Proč až tady:** naučí to partu, že chování lže. Dokud si parta nevěří, že číst umí, je to demotivující.

### 6.2 Variabilní parametry
Mezi partiemi se losuje: počet sabotérů (v rámci veřejně oznámeného rozpětí), limit šicht, sada šeptand, sada miniher, zapnuté přepínače. **Nikdy se neskrývají uvnitř běžící hry.**

### 6.3 Stín na šichtě
Do party je tajně přidán jeden člověk navíc. Stůl si myslí, že šli čtyři, ale šlo jich pět. Nepřidává informaci — bere jistotu té stávající.

### 6.4 Dvojitá vražda
Jen pro 10+ hráčů, jen po dvou padlých šichtách za sebou.

---

## 7. Architektura

### 7.1 Zásady

**Klient nikdy nečte nic, co nemá vidět.** Jediná cesta, kterou stav opouští server, je `pohledPro()` v `src/game/pohled.ts`. Spočítá přesně to, co tenhle hráč v téhle fázi smí vidět, a vrátí hotový objekt. Má vlastní testy na únik rolí i na časování: hlasy až od odhalení, oběť až ráno, odměna z noci stolu až ráno.

**Pravidla žijí jen v `src/game/`.** Čistý reducer bez UI, bez hodin a bez náhody zvenčí: náhodu dostane jako `seed`, hodiny nemá vůbec. Ten samý kód běží v prohlížeči (hra na jednom telefonu, vývojová pomůcka) i v Durable Objectu (hra po síti).

**Kdo smí co poslat, rozhoduje `src/game/opravneni.ts`.** Fáze posouvá jen server, hru spouští jen zakladatel, odměnu vybírá jen předák, každý jedná jen sám za sebe. Worker to volá s id hráče podle tokenu, co neprojde, se zahodí.

### 7.2 Durable Object

Jedna instance na jednu místnost. Drží `stav` (tvaru `Stav` z `types.ts`), mapu `token → hráč`, náhodu místnosti `seed` (losuje se při založení a znovu při každém startu partie, nikdy neopouští server), počítadlo id hráčů a typ naplánovaného alarmu.

Fáze posouvá `alarm()`. Po každé akci worker rozhodne, co s odpočtem: nová fáze dostane plnou délku z `delkaFaze()`, fáze, ve které odevzdali všichni (`fazeHotova()`), skončí do dvou vteřin, pauza alarm smaže a zapamatuje si zbývající čas, návrat ho obnoví od stejné vteřiny. Dohraná místnost se smaže po šesti hodinách, prázdná šatna po dni.

### 7.3 Reconnect

Telefon se zamkne za 30 s, iOS Safari kartu uspí. Proto:

- **Veškerý stav je na serveru.** Klient je čistá zobrazovací vrstva bez vlastní pravdy; návrat přes `token` v `localStorage` vrátí téhož hráče.
- **Odpočet se nepočítá z hodin telefonu.** Server posílá v pohledu `konecFaze` a s každou zprávou svůj čas `ted`; klient si spočítá posun hodin a odpočet jen kreslí.
- **Wake lock** drží displej během hry (`src/ui/bdeni.ts`). Bez něj by rozprava s telefony dolů skončila hromadným výpadkem.
- **Pauza jen tam, kde se od odpojeného něco čeká** (rozdání, šichta, nominace, rada, noc). V rozpravě nebo u výsledku se nečeká, kdo se vrátí, pokračuje. Zakladatel může rozhodnout, že se hraje bez něj: jeho volba pak propadne.
- Do rozehrané hry se nový hráč nepřidá, dostane vysvětlení. Kdo v šatně vypadl a nevrátil se, se startem odpadne.

### 7.4 Nasazení

Statická PWA i API běží na jednom Cloudflare Workeru (`wrangler.toml`, `[assets]` servíruje `dist/`). Žádný CORS, žádná druhá adresa. Připojení kódem místnosti nebo odkazem `?k=KÓD`. Varianta na Supabase, která tu dřív ležela jako slepá větev, je smazaná; kdo by ji chtěl, najde ji v historii gitu do commitu `4497454`.

### 7.5 Zvuk a tempo

V tomhle formátu rozhoduje **rituál** — znělka noci, odpočet poslední minuty rozpravy, úder při odhalení vyhoštěného. Bude to na zážitek rozhodovat víc než počet funkcí. Nahlas hraje jen zakladatelův telefon, vibrace má každý svoje (iPhone ji neumí).

---

## 8. Co se do hry nedostane

- **Další role.** Žádný věštec, doktor, lovec.
- **Chat v aplikaci.** Mluví se u stolu.
- **Účty a přihlašování.** Jméno a kód místnosti.
- **Vzdálený režim.** Všichni jsou v jedné místnosti. Vždycky.
- **Statistiky napříč hrami** ve v1.
- **Nativní aplikace a app store.** PWA.

---

## 9. Simulace vyvážení — výsledky

Skript: [`balance-sim.mjs`](balance-sim.mjs) · spuštění `node docs/balance-sim.mjs --games 6000`

### Metodika

Bot-pracant drží **přesnou bayesovskou inferenci nad všemi možnými množinami sabotérů** (při 12 hráčích a 4 sabotérech 495 hypotéz). Po každé šichtě přepočítá věrohodnost každé hypotézy z (parta, počet sabotáží, známá politika sabotérů), a natvrdo vyškrtne hypotézy neslučitelné s odhalenou rolí vyhoštěného a s tím, že **zavražděný je vždy pracant**. Hlasuje pak pro hráče s nejvyšší marginální pravděpodobností.

Bot-sabotér zná počet sabotérů ve své partě a kazí podle politiky — výchozí "vyvážená" kazí při osamocení v 85 % případů, při více sabotérech s pravděpodobností 1/k, aby nekazili oba najednou.

### Co z toho platí a co ne

Bot má dokonalou paměť a počítá přesně. **Reálný hráč je na mechanické ose výrazně slabší** — nikdo u stolu nedrží 495 hypotéz. Zároveň má ale navrch čtení chování, blafování a to, že se dá lhát. Výsledná lidská čísla budou jinde a **není předem jasné kterým směrem**.

> Dřív jsem tvrdil, že bota stačí trefit na 25–35 % a lidé skončí kolem 50 %. To byla úvaha naruby — bot je strop mechanické dedukce, ne její spodní odhad. Obhajitelné je jen tohle užší tvrzení: **pod 25 % je nastavení rozbité pro pracanty, nad 80 % vyřeší hru samotné mechaniky a nezbude prostor pro sociální hru.** Pásmo 35–60 % nechává rezervu na obě strany. Skutečnou kalibraci udělá až první playtest.

### Hlavní zjištění

| Zjištění | Čísla |
|---|---|
| **Jeden sabotér nefunguje nikde** | 98,2–99,9 % výher pracantů při 6–12 hráčích |
| **Zpomalit úbytek je nutné** | 8 hr / 3 sab: 31,0 % → **42,3 %** (nabídka odměn) nebo 41,6 % (cooldown) |
| **Šeptanda je nejsilnější laditelná páka pro pracanty** | 66,5 % → **74,6 %** (+8 bodů) |
| **Ukazovat počet sabotáží je pro vyvážení zdarma** | 74,1 % vs. 75,0 % — v šumu |
| **Agresivní sabotéři prohrávají** | kazit pokaždé = 87,6 % výher pracantů |
| **Zrušení parity pracantům pomohlo** | 66,0 % → 73,3 %, partie o půl kola delší |
| **Limit šicht při malém stole skoro nikdy nenastane** | 8 hráčů: dojde na něj 3,5 % partií · 12 hráčů: 47,7 % |

### Co to znamená pro design

1. **Tabulka sestav se přepsala** (§3.1). Správný poměr je kolem 3 sabotérů na 8 hráčů (~37 %), ne 25 %, jak jsem původně odhadl.
2. **Přibyla nabídka odměn** (§3.2.1). Bez zpomalení úbytku umíraly partie vybitím stolu po ~3,8 kolech, než stihly dospět. Nabídka odměn a cooldown vražd vyšly v simulaci prakticky stejně (42,3 % vs. 41,6 %), takže rozhodla hratelnost: nabídka je rozhodnutí u stolu, cooldown je účetnictví napříč koly.
3. **Limit šicht neprodává to, co jsem tvrdil.** Psal jsem, že je to hlavní tlak na pracanty — ve skutečnosti se při osmi hráčích uplatní v 3,5 % partií. Je to pojistka proti zdržování u velkých stolů, ne motor napětí. Malé stoly hru dohrají vyřešením nebo vybitím.
4. **Ukazovat počet sabotáží je čistý zisk** — na vyvážení nesáhne a přidá sabotérům rozhodování.

### Přeměření 2026-09-20: jedna směna, strop tří pravd

Po přechodu na individuální šeptandu se stropem tří pravd a po vypnutí dvou směn se sestavy přeměřily znovu (`scratch/jedna-smena.mjs`, 3000 až 5000 partií na sestavu). Výsledek je tabulka v §3.1. Kandidáti, kteří neprošli:

| Hráčů | Sestava | Bot | Limit padne | Proč ne |
|---|---|---|---|---|
| 9 | 3 sab, limit 5 | 37,8 % | 10 % | pod pásmem |
| 12 | 3 sab, limit 5 | 43,0 % | 50 % | půlka partií končí vyčerpáním limitu, ne vyřešením |
| 12 | 3 sab, limit 6 | 65,1 % | 16 % | nad pásmem |
| 12 | 4 sab, limit 6 | 29,7 % | 21 % | pod pásmem |

### Známá zjednodušení simulátoru

Rada je zjednodušená na prostou většinu (bez fáze nominací, kvóra a soubojů dvou kandidátů). Šeptandu simuluje jinak než kód: modeluje tři rodiny z osmi a `whisperFacts` říká, kolik pravd za kolo vznikne, zatímco hra rozdává tři pravdy mezi všechny. Hlasy Stínů utrácí heuristika (těsné hlasování nebo konec hry). Ze sedmi navržených typů šeptandy jsou implementované tři. Minihry, banka ani upgrady ve v2 se nesimulují vůbec.

**Jedno zjednodušení je zásadní a zneplatňuje jeden výsledek:** všichni bot-pracanti počítají tutéž posterior a hlasují proto prakticky jednotně. Reálný stůl je rozhádaný a hlasy se tříští. Proto **výsledek u pravidla "rada vyžaduje většinu živých" (31,0 % → 31,2 %, tedy nic) není důvěryhodný** — testuje se tím přesně ta interakce s roztříštěným hlasováním, kterou tihle boti neumí vyrobit. U stolu by to fungovat mohlo. Chce to playtest, ne další simulaci.

---

## 10. Co sledovat při prvním playtestu

1. **Ležely telefony během rozpravy na stole?** Když ne, je to nejdůležitější věc k opravě.
2. **Kolik minut trvalo, než někdo poprvé řekl "ale ty jsi byl na té šichtě"?** Čím dřív, tím líp.
3. **Měly Stíny co dělat, nebo se nudily?** A neukecaly stůl natolik, že živí přestali přemýšlet?
4. **Utratily Stíny hlasy chytře, nebo hned v prvním kole?**
5. **Přišel limit šicht dřív, než hra dospěla?**
6. **Řešili sabotéři, kdo kazí — nebo kazili oba bez rozmyslu?**
7. **Řekla parta po skončení "ještě jednou"?** Jediná metrika, na které záleží.

---

## 11. Otevřené otázky

- **Limit šicht.** Přeměřený simulací (§9), ale bot je strop, ne stůl. Doladí se po playtestu z protokolu partie.
- **Dvě směny.** Vypnuté (§3.2.2). Zapnou se, až velkému stolu prokazatelně chybí stopy.
- **Kvórum v radě.** Nadpoloviční většina odevzdaných hlasů a nejméně dva. Při třech a víc kandidátech bude kolo bez vyhoštění častější; jestli to stůl unese, ukáže playtest.
- **Délka rozpravy.** 4 minuty je odhad; nejspíš 3 min při 5–6 hráčích, 5 min při 10+.
- **Stín nemůže být nominován** — správně? Alternativa: může, a je to způsob, jak zlikvidovat nepohodlný hlas stínu.
- **Kolo 1 a koordinace sabotérů.** V prvním kole ještě neproběhla noc, takže Domluva (v1.2) není k dispozici. Nechat první kolo naslepo, nebo dát krátkou poradu před první šichtou?
- **Dynamická velikost party** může u malých stolů dojít na partu o 2 lidech — je to ještě zajímavé, nebo to usvědčuje?
