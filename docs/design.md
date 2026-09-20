# Šichta — herní design

**Stav:** návrh v2, 2026-09-19 · **Název:** Šichta (EN: *Shift*) · **Týmy:** Pracanti vs. Sabotéři
**Formát:** fyzická společenská hra pro 5–12 lidí v jedné místnosti, řízená PWA na telefonech hráčů. Bez vypravěče.
**Délka partie:** 25–30 min (5–7 hráčů) · 45–60 min (8–12) · **Stack:** Vite PWA (GitHub Pages) + Supabase · **Repo slug:** `sichta`

---

## 1. Co to je

Sociální dedukční hra u stolu. Část party jsou tajní **Sabotéři**. Každé kolo jde vybraná parta na **šichtu** — sabotéři ji můžou tajně pokazit. Pokud šichta selže, sabotéři si tu noc smí někoho odstranit. Pokud projde, parta se dozví jednu pravdivou **šeptandu**. Mezi tím se sedí u stolu a hádá se.

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

*Čísla níž jsou výsledek simulace (§9), ne odhad. Sloupec vpravo je výhra bota-pracanta; pásmo 35–60 % je použitelné.*

Hra má **dva režimy** a hranice je mezi 7 a 8 hráči. Není to kosmetika — malý stůl chce strukturálně jinou partii.

#### Krátká šichta — 5 až 7 hráčů

| Hráčů | Sabotérů | Limit šicht | Směny | Bot |
|---|---|---|---|---|
| 5 | 2 | 4 | 1 | 42,7 % |
| 6 | 2 | 3 | 1 | 41,6 % |
| 7 | 2 | 3 | 1 | 42,1 % |

Krátká, ostrá partie na ~25–30 minut. **Páka není počet sabotérů, ale délka hry.** Při limitu 5 vyhrávají pracanti ~69 % a je to nuda; při limitu 3 to sedí. Málo kol znamená, že si pracanti nemůžou dovolit jedno promarněné vyhoštění — a přesně ten tlak dělá malý stůl zajímavým.

**Čtyři hráči jsou nehratelní.** V celé prohledané mřížce (sabotéři × limit × šeptanda × směny) neexistuje jediná konfigurace v pásmu. Tři pracanti proti jednomu sabotérovi je hádání, ne dedukce. Pět je tvrdá spodní hranice.

#### Plná šichta — 8 až 12 hráčů

| Hráčů | Sabotérů | Limit šicht | Směny | Bot |
|---|---|---|---|---|
| 8 | 3 | 6 | 2 | 48,1 % |
| 9 | 3 | 5 | 2 | 47,8 % |
| 10 | 3 | 6 | 2 | ~57 % |
| 12 | 4 | 7 | 2 | ~46 % |

Delší partie na 45–60 minut se dvěma směnami za kolo (§3.2.2).

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
| 3 | **Výsledek** | 15 s | dolů | "Šichta prošla" / "Šichta padla — kazili **2**". Počet sabotáží se ukazuje. |
| 4 | **Šeptanda** | 20 s | dolů | Jen když šichta prošla. Aplikace veřejně vysloví jednu **pravdivou, ale měkkou** informaci (viz 3.5). |
| 5 | **Rozprava** | 4 min | **DOLŮ** | Mluví se. Aplikace ukazuje jen velký timer a přehled: historie part, výsledků a **kompletní historie hlasování**. |
| 6 | **Nominace** | 60 s | v ruce | Všichni najednou tajně nominují jednoho hráče. Do rady jdou dva s nejvíc nominacemi. Stíny nenominují. |
| 7 | **Rada** | 45 s | v ruce | Hlasuje se mezi nominovanými. **Aplikace pak veřejně ukáže, kdo koho volil.** Remíza → nikdo neodchází (a to je tlak). |
| 8 | **Noc** | 60 s | v ruce | Jen když šichta padla: **Předák vybere odměnu** (viz 3.2.1); u vraždy sabotéři navrhnou oběť a Předák rozhodne (viz 3.4). Všichni ostatní zároveň zapisují svého hlavního podezřelého — sčítá se do ceny "Nejlepší čuch". Fáze trvá stejně dlouho, i když nikdo neumírá. |

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

**Vražda nejde dvakrát po sobě.** Aplikace to tlačítko po vraždě prostě zašedne. Tím padá poslední námitka proti cooldownu — není co si pamatovat, hráč vidí, co smí, a rozhoduje se jen mezi tím, co je na obrazovce.

**Všichni sabotéři vidí, co Předák vybral.** Jsou tým, nemá smysl to před nimi tajit — a v režimu *Tajný sabotér* (§6.1) je právě tohle ta obrazovka, kde falešní sabotéři poprvé zapochybují.

> Aby nabídka fungovala, musí být alternativy **opravdu lákavé**. Kdyby sabotéři brali vraždu pokaždé (a mohli), jsme zpátky na 31 % a tempo je rozbité. Je to první věc ke sledování při playtestu.

### 3.2.2 Dvě směny — dopolední a odpolední (8+ hráčů)

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

- V noci **sabotéři hlasují**, koho odstranit. Předák pak vidí výsledek a rozhodne, jestli ho poslechne, nebo zabije podle sebe. Žádné losování při shodě — jeden člověk vlastní to rozhodnutí.
- Ostatní sabotéři **vidí, že přehlasoval**, ale v režimu *Tajný sabotér* (§6.1) nevědí proč. Tohle je jediný kus mechaniky, který ten režim potřebuje — proto ho v1 zavádí, i když ho sama nevyužije.
- Když Předák zemře nebo je vyhoštěn, funkce přechází na dalšího žijícího sabotéra (pořadí podle sedadla, aplikace to ví předem).
- **Hook pro v3:** v režimu *Tajný sabotér* je Předák jediný pravý sabotér — ostatní si jen myslí, že sabotéři jsou. V tom režimu se označení "Předák" nikomu nezobrazuje, aby to neprozradilo.

### 3.5 Šeptanda

Odměna pracantů za úspěšnou šichtu. **Vždy pravdivá.** Vždy měkká.

- "Aspoň jeden sabotér dnes hlasoval pro vyhoštění **[jméno]**."
- "Sabotéři se dnes v noci neshodli."
- "Aspoň jeden sabotér byl dnes v šichtě."
- "Dnes v šichtě nebyl ani jeden sabotér."
- "Aspoň jeden sabotér dnes nikoho nenominoval."
- "Aspoň jeden sabotér nominoval **[jméno]**."
- "Všichni sabotéři dnes hlasovali stejně."

Všimni si, co dělají: **otevírají zpátky už proběhlá hlasování a nutí lidi obhajovat, proč volili, jak volili.** To je přesně energie kulatého stolu.

**Zakázaný typ šeptandy:** cokoliv ve tvaru "mezi A, B, C je právě jeden sabotér". To je zadání logické úlohy, ne pomluva.

### 3.6 Stíny (vyřazení hráči)

Vyřazený zůstává sedět u stolu a:

- **mluví úplně normálně** dál, celou zbývající hru
- **nesmí nominovat** a **nesmí být nominován**
- **nechodí na šichty**
- má **jeden jediný hlas na celý zbytek hry** — kdykoliv ho v radě použije, je nadobro pryč

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

**Klient nikdy nečte nic, co nemá vidět.** Neskládáme to z RLS pravidel nad deseti tabulkami — to je děravé.

> Jediné čtecí API je RPC **`get_my_view(room_code, client_token)`**, která na serveru spočítá přesně to, co tenhle hráč v téhle fázi smí vidět, a vrátí hotový objekt. Realtime kanál slouží **jen k oznámení "stav se změnil, načti si view"** — neposílá žádná data.

Rozdání rolí a vyhodnocení fází běží v **Edge Functions / SQL funkcích**, nikdy na klientovi.

### 7.2 Datový model (náčrt)

```
rooms     id, code, host_player_id, status, config jsonb,
          phase, round_no, phase_ends_at, created_at
players   id, room_id, name, seat, is_alive, ghost_vote_used,
          client_token, last_seen_at
roles     room_id, player_id, role, is_foreman   -- klient nikdy nečte přímo
rounds    room_id, round_no, team jsonb, sabotage_count,
          whisper, banished_id, victim_id
actions   room_id, round_no, player_id, kind, payload jsonb
          -- kind: shift_vote | nomination | council_vote
          --       night_proposal | foreman_decision | suspicion
```

### 7.3 Reconnect — hlavní technické riziko

Telefon se zamkne za 30 s, iOS Safari kartu uspí. Když stav drží klient, hra uprostřed umře.

- **Veškerý stav je na serveru.** Klient je čistá zobrazovací vrstva bez vlastní pravdy.
- Návrat přes `client_token` v `localStorage` → `get_my_view` → hráč pokračuje.
- **Timery se nikdy nepočítají z hodin klienta.** Server drží `phase_ends_at`, klient si jednou změří offset a odpočet jen vykresluje.
- Posun fáze: RPC `advance_phase(room, expected_phase, expected_round)`, **idempotentní** — zavolá ji kterýkoliv klient, druhé zavolání neudělá nic. Žádný cron, žádné náklady.
- `navigator.wakeLock` drží displej během aktivních fází.
- `last_seen_at` + indikátor odpojeného hráče.

### 7.4 Nasazení

Statická PWA na GitHub Pages (`base: '/sichta/'`), Supabase drží stav. Připojení kódem místnosti nebo QR.

### 7.5 Zvuk a tempo

V tomhle formátu rozhoduje **rituál** — znělka noci, odpočet poslední minuty rozpravy, úder při odhalení vyhoštěného. Bude to na zážitek rozhodovat víc než počet funkcí.

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

Skript: [`sichta-sim.mjs`](sichta-sim.mjs) · spuštění `node sichta-sim.mjs --games 6000`

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

### Známá zjednodušení simulátoru

Rada je zjednodušená na prostou většinu (bez fáze nominací a soubojů dvou kandidátů). Hlasy Stínů utrácí heuristika (těsné hlasování nebo konec hry). Ze sedmi navržených typů šeptandy jsou implementované tři. Minihry, banka ani upgrady ve v2 se nesimulují vůbec.

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

- **Limit šicht.** Odhad, ne výsledek. První věc k odsimulování.
- **Délka rozpravy.** 4 minuty je odhad; nejspíš 3 min při 5–6 hráčích, 5 min při 10+.
- **Stín nemůže být nominován** — správně? Alternativa: může, a je to způsob, jak zlikvidovat nepohodlný hlas stínu.
- **Kolo 1 a koordinace sabotérů.** V prvním kole ještě neproběhla noc, takže Domluva (v1.2) není k dispozici. Nechat první kolo naslepo, nebo dát krátkou poradu před první šichtou?
- **Dynamická velikost party** může u malých stolů dojít na partu o 2 lidech — je to ještě zajímavé, nebo to usvědčuje?
