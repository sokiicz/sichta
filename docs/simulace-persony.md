# Simulace s dvaceti personami

**Stav:** 2026-10-03 · **Nástroj:** [persony/](persony/README.md) · **Rozsah:** přes 600 tisíc partií na skutečném reduceru

Dvacet vymyšlených hráčů (rodina, kamarádi, deskovkáři, firma, večírek, školáci) usazených ke stolům o 5 až 12
lidech. Hraje se **skutečným kódem hry**: `reducer`, `pohledPro`, losování part, šeptanda ze `septanda.ts`,
kvórum rady, hlasy stínů, odměny, limit. Modelované je jen to, **jak lidé rozhodují**. Starší
[balance-sim.mjs](balance-sim.mjs) měřil kostru hry s dokonalým botem, tohle měří hru s lidmi, kteří
zapomínají, mýlí se, nechávají se přesvědčit a lžou.

> **Jak číst čísla.** Úroveň (kolik procent vyhrávají pracanti) je **odhad s velkou nejistotou**, protože
> chování lidí nemám změřené, jen předpokládané. Srovnání mezi sestavami, stoly a nastaveními je spolehlivější:
> drží ve všech variantách modelu (kapitola 10). Absolutní čísla ověří až playtest.

---

## Shrnutí

1. **Lidské stoly vycházejí pod botem.** Pracanti vyhrávají 29 až 44 % při 6 až 12 hráčích. Bot v tabulce
   `design.md` §3.1 má 38 až 48 % (rozdíl 2 až 17 bodů, nejvíc při 7, 10 a 11 hráčích), dokonalý robot na
   stejném enginu 50 až 65 % (rozdíl 20 až 30 bodů).
2. **Většina partií končí časem, ne rozuzlením.** Při 7, 8, 10 a 11 hráčích vyčerpáním limitu šicht končí
   **64 až 69 %** partií (bot v tabulce: 20 až 54 %). Hlasy pracantů přitom míří na sabotéra v 53 až 57 % případů, jenže ve třech až pěti
   kolech jim to nestačí.
3. **Limit šicht je nejsilnější páka.** Jedno kolo navíc zvedne výhru pracantů o 8 až 22 bodů (kapitola 7).
   Při limitu o jedna vyšším vychází 7 hráčů na 54 %, 10 hráčů na 45 %, 11 na 51 %, 12 na 42 %.
4. **Kdo je sabotér, rozhoduje víc než kdo je pracant.** Tým sabotérů vyhrává od 51 % (Tereza) po 80 % (Pavel);
   dvojice sabotérů od 36 % po 92 %. Pracanti se mezi sebou liší jen o ±5 bodů. Role losuje aplikace, takže
   stejná sestava dává podle štěstí v losu úplně jinou hru.
5. **Tichí a nepozorní jsou obětní beránci.** Petr, Ivo a Tereza jsou jako pracanti vyhoštěni nevinně v 47 až
   49 % partií, hlasití pracanti v 21 až 24 %. Hra trestá mlčení.
6. **Pětka je skoro vyhraná pro pracanty (87 %).** Odpovídá označení „tréninková partie“. Nejvyváženější je
   šestka (44 %), nejtěžší pro pracanty sedmička (29 %).
7. **Délka partie.** 8 hráčů se odehraje za 24 minut, ne za 45 až 60, jak říká `design.md` v hlavičce, a
   5 hráčů za 15, ne za 25 až 30. 9 až 11 hráčů trvá 43 až 45 minut, 12 hráčů 62. Do toho se nepočítá šatna a vysvětlování pravidel.
8. **Vypnout noční vraždy pomáhá sabotérům, ne pracantům.** Bez vražd mají pracanti o 7 až 10 bodů míň
   (8 hráčů: 33 → 25 %). Sabotéři si pak berou imunitu (71 % padlých nocí), která v krátké hře zablokuje celou
   radu. Komentář u volby `vrazdy` v `types.ts` tvrdí, že se vypnutí hodí tam, kde mají sabotéři navrch;
   simulace říká opak.
9. **Večer pěti partií pracantům nepomáhá.** Učí se obě strany a výhra pracantů je v páté partii stejná nebo
   nižší (8 hráčů: 38 → 31 %).
10. **Co všechno na tom visí:** mezi nejhorší a nejlepší variantou modelu je rozdíl 17 až 50 % (kapitola 10).
    Nejcitlivější jsou dvě věci: jestli rozprava skutečně sjednotí stůl (bez ní −14 bodů) a jestli sabotéři
    ve šeptandě lžou (bez lhaní +10 bodů).

---

## 1. Co je skutečné a co je model

**Skutečné.** Všechno z `src/game/`: sestavy z `rules.ts`, role, předák, losování party, tajná volba MAKAT
nebo KAZIT, výsledek s počtem sabotáží, věty šeptandy (tři pravdy rozdané všem), nominace s imunitou,
kandidáti, poslední slovo, rada s kvórem (nadpoloviční většina a nejméně dva hlasy), hlasy stínů, odměny
(vražda, imunita, tma), nástupnictví předáka, limit, konec. Hráč se dívá jen na to, co dostane z `pohledPro()`.

**Model.** Rozhodování každého hráče:

- **Vlastní mysl.** Každý drží váhy nad všemi možnými množinami sabotérů (až 495 hypotéz). Z padlé a prošlé šichty,
  z odhalených rolí vyhoštěných a z hlasů v radě si skládá obraz. Kolik z důkazu využije a kolik si pamatuje,
  určují rysy `analytika` a `pamet`; intuice je zašuměná (`sum`).
- **Vlastní šeptanda.** Pracant bere svou větu jako jistotu, protože je pravdivá. Cizí věty váží podle toho,
  jestli je řekl víc lidí, a chová se přitom jako pracant, který nelže, takže věta, která nesedí, ukáže
  i na mluvčího.
- **Sabotéři lžou.** Vymýšlejí věty (útočné: „aspoň jeden z těch tří je sabotér“, obranné, neškodně pravdivé),
  umí zopakovat partnerovu větu, aby jí dodali váhu, a zkušení se vyhýbají tvrzením, která odporují veřejně
  známým rolím. Kdo lež pozná, určuje čtení lidí (`detekce` proti `lhani`).
- **Rozprava.** Mluví ti, kdo mají hlas. Každý se přibližuje k váženému průměru toho, co zaznělo; váha je
  hlasitost mluvčího krát důvěra posluchače, ochota je sugestibilita. Každý hájí sám sebe a lháře může
  prohlédnout čtení lidí. Dvě kola, aby se stihla ozvat odpověď.
- **Rozhodnutí.** Nominace a hlas podle podezření s prahem odvahy a zdrženlivosti, pomsta, přátelství,
  trollení, nepozornost (vynechaný tah). Stíny utrácejí hlas podle netrpělivosti, v posledních kolech
  a když si jsou jisté.
- **Sabotéři v partě i mimo ni.** Kdy kazit (jeden sám téměř vždy, dva se domlouvají konvencí „kazí ten
  s nižším sedadlem“, jen pokud ji znají oba), kdy obětovat partnera, jakou odměnu vzít a koho zavraždit
  (největší hrozba, mstivě, nahodile). Zkušení vědí, že v posledním kole sabotáž nemá smysl: odměna přijde
  až po poslední radě.
- **Čas.** Každá fáze má reakční dobu podle tempa hráče a strop z `delkaFaze()`, takže vychází i délka
  partie. Tohle je odhad a nepočítá šatnu ani vysvětlování.

### Kalibrace proti starému simulátoru

Stůl dokonalých robotů (bez společenské vrstvy, sabotéři mlčí a zabíjejí nejdůvěryhodnějšího) by měl
dát čísla podobná botovi z `balance-sim.mjs`.

| Hráčů | Bot v design.md | Roboti v enginu | ± | Limit padne | Kol |
|---|---|---|---|---|---|
| 5 | n/a | 97,3 % | 0,6 | 2 % | 1,7 |
| 6 | 48 % | 64,6 % | 1,7 | 13 % | 3,1 |
| 7 | 46 % | 50,3 % | 1,8 | 42 % | 3,2 |
| 8 | 44 % | 60,7 % | 1,7 | 39 % | 3,0 |
| 9 | 40 % | 62,9 % | 1,7 | 5 % | 4,5 |
| 10 | 47 % | 51,7 % | 1,8 | 37 % | 4,9 |
| 11 | 46 % | 58,4 % | 1,8 | 39 % | 4,8 |
| 12 | 38 % | 62,8 % | 1,7 | 16 % | 6,1 |

Řádově to sedí, ale roboti v enginu jsou o 5 až 25 bodů lepší než bot v dokumentaci, nejvíc při 12 hráčích.
Starý simulátor při stejném nastavení (cooldown 1, odměny 60 %) dává 7: 41,5 %, 9: 55,4 %, 12: 45,5 %,
takže rozdíl proti enginu je 8, 8 a 17 bodů. Příčinu jsem nehledal. Kandidáti: skutečná šeptanda má osm
rodin včetně „tichý sabotér“ a „předák“, které starý model nemá, a skutečná rada má kvórum a nominace
místo „prosté většiny“. Pro čtení dalších kapitol stačí vědět, že **dokonalý pracant v enginu vychází líp,
než říká tabulka v §3.1, a lidský mnohem hůř.**

---

## 2. Dvacet person

Každá persona je sada dvaceti rysů (0 až 1), celé jsou v [persony/persony.ts](persony/persony.ts).
Sloupce vpravo jsou výsledky z kapitoly 5: o kolik bodů mění výhru svého týmu proti průměru, když sedí u
stolu jako pracant, a jak často vyhraje tým sabotérů, když je sabotér.

| Persona | Portrét | Pracant | Sabotér |
|---|---|---|---|
| **Tomáš** (34), Excel | Programátor. Píše si poznámky, pamatuje každou partu a hlas. Počítá, ale lhát neumí a mluví dlouho. | +1,6 | 66 % |
| **Jana** (29), Megafon | Extrovertka, vyplní každé ticho. Obviňuje rychle a nahlas, často mimo. Co řekne hlasitě, se prosadí. | +4,2 | 75 % |
| **Petr** (41), Mlčenlivý | Introvert s pokerovou tváří. Skoro nemluví, málokdy nominuje. | −3,9 | 59 % |
| **Marek** (31), Veterán | Léta hraje Mafii a Werewolfa. Čte stůl, lže bez mrknutí, s partnerem se domluví beze slov. | +4,4 | 78 % |
| **Lenka** (25), Nováček | Hraje poprvé a pravidla chápe napůl. Hlasuje podle pocitu, nechá se přesvědčit prvním, kdo se ozve. | −2,0 | 58 % |
| **Kuba** (22), Šašek | Hraje pro srandu. Nominuje kamarády, aby se smáli, občas si vymyslí šeptandu. | −1,2 | 66 % |
| **Radek** (37), Mstitel | Nezapomíná. Kdo proti němu hlasoval, ten je jeho cíl. Jinak solidní hráč. | +1,7 | 70 % |
| **Hanka** (38), Ovečka | Nechce rozhodnout. Počká, kam se přikloní většina. | −2,4 | 59 % |
| **Ondra** (33), Paranoik | Nevěří nikomu. Nominuje každé kolo, mění cíle. | −0,3 | 66 % |
| **Eliška** (27), Důvěřivka | Věří každému, kdo se tváří upřímně. Při hlasování se raději zdrží. | −2,6 | 59 % |
| **Martin** (45), Diplomat | Hledá kompromis, umí stůl uklidnit. Když mluví, poslouchají ho. | +2,1 | 70 % |
| **Pavel** (35), Lhář | Charismatický a sebejistý. Jako sabotér noční můra, jako pracant působí podezřele, protože se usmívá. | +3,8 | **80 %** |
| **Dana** (33), Červenající | Poctivá, neumí lhát, červená se. Jako pracant skvělá, jako sabotér průhledná. | +0,7 | 59 % |
| **Filip** (28), Soutěživec | Chce vyhrát za každou cenu. Riskuje, tlačí na hlasování, kazí tvrdě. | +3,3 | 74 % |
| **Tereza** (19), Do mobilu | Půlka pozornosti je jinde. Tahy stíhá na poslední chvíli, někdy vůbec. | **−5,7** | **51 %** |
| **Vojta** (14), Puberťák | Impulzivní, chce dělat, co jeho kamarád. Krátká pozornost, málo trpělivosti. | −3,0 | 59 % |
| **Božena** (71), Babi | Pomalá s telefonem, pozorně sleduje lidi. Věří všem. Šeptanda jí trvá minutu. | −1,7 | 58 % |
| **Zdeněk** (52), Šéf | Zvyklý velet. Řekne, kdo je sabotér, a čeká, že se podle toho bude hlasovat. | +3,8 | 76 % |
| **Šárka** (36), Čtenářka lidí | Psycholožka. Nepočítá, ale vidí, kdo se při větě zasekl. | +2,3 | 70 % |
| **Ivo** (47), Ať to skončí | Chce být doma do deseti. Pořád tlačí, ať se zkrátí rozprava a ať se hlasuje. | −4,8 | 57 % |

---

## 3. Náhodný stůl, 5 až 12 hráčů

Každé sedadlo losované z dvaceti person (každá nejvýš dvakrát u jednoho stolu), jedna dvojice kamarádů.
4000 partií na velikost. Sestavy jsou z `rules.ts`.

| Hráčů | Sab. | Limit | Pracanti | ± | Sabotéři vyhrají limitem | Sabotéři vybijí stůl | Kol | Minut | Rada bez vyhoštění |
|---|---|---|---|---|---|---|---|---|---|
| 5 | 1 | 3 | **87,5 %** | 1,0 | 12 % | 1 % | 2,2 | 15 | 16 % |
| 6 | 2 | 4 | 43,8 % | 1,5 | 34 % | 22 % | 3,9 | 26 | 19 % |
| 7 | 2 | 3 | **29,4 %** | 1,4 | 69 % | 1 % | 3,6 | 24 | 15 % |
| 8 | 2 | 3 | 35,8 % | 1,5 | 64 % | 0 % | 3,5 | 24 | 13 % |
| 9 | 3 | 6 | 38,3 % | 1,5 | 35 % | 27 % | 5,8 | 45 | 17 % |
| 10 | 3 | 5 | 33,0 % | 1,5 | 64 % | 3 % | 5,4 | 43 | 15 % |
| 11 | 3 | 5 | 34,4 % | 1,5 | 65 % | 0 % | 5,4 | 45 | 14 % |
| 12 | 4 | 7 | 31,4 % | 1,4 | 55 % | 14 % | 7,2 | 62 | 15 % |

Co z toho plyne:

- **Sabotéři vyhrávají hlavně časem.** Vybití stolu se objevuje jen u 6, 9 a 12 hráčů (22, 27 a 14 %),
  jinde skoro nikdy. Při vybití hra dospěje a dramaticky skončí, při časovém limitu se prostě doběhne.
  Tabulka v §3.1 ukazuje u 8 hráčů „limit padne 54 %“ a u 12 hráčů 6 %, lidé to mají 64 a 55 %.
- **Sedm hráčů je nejhůř.** Dva sabotéři a jen tři kola dávají pracantům 29 %. Osm hráčů při stejném limitu
  a stejné velikosti party (čtyři) vychází o 6 bodů líp. Rozumné vysvětlení je, že při sedmi je sabotérů
  29 % stolu a při osmi 25 %, ale nezkoumal jsem to.
- **Rada bez vyhoštění je častá, ale hra se kvůli ní nezadrhává.** V 13 až 19 % rad nikdo neodejde
  (kvórum nebo rozdělené hlasy). K otázce „unese to stůl?“ z §11: v modelu ano, skutečný stůl ukáže playtest.

### Co se u stolu dělo

| Hráčů | Padlých šicht | Dvojitá sabotáž | Vyhoštěn sab. / partii | Vyhoštěn prac. / partii | Vražda / padlá noc | Imunita | Tma | Přesnost nominací | Přesnost hlasů |
|---|---|---|---|---|---|---|---|---|---|
| 5 | 41 % | 0 % | 0,87 | 0,84 | 39 % | 14 % | 3 % | 63 % | 60 % |
| 6 | 48 % | 4 % | 1,23 | 1,53 | 46 % | 29 % | 5 % | 68 % | 64 % |
| 7 | 46 % | 5 % | 0,96 | 1,45 | 54 % | 26 % | 6 % | 58 % | 54 % |
| 8 | 44 % | 4 % | 1,09 | 1,38 | 56 % | 22 % | 6 % | 59 % | 55 % |
| 9 | 53 % | 8 % | 1,79 | 2,57 | 47 % | 33 % | 5 % | 62 % | 57 % |
| 10 | 51 % | 9 % | 1,72 | 2,27 | 51 % | 31 % | 6 % | 60 % | 55 % |
| 11 | 51 % | 9 % | 1,73 | 2,34 | 53 % | 28 % | 7 % | 58 % | 53 % |
| 12 | 53 % | 12 % | 2,36 | 3,23 | 48 % | 35 % | 5 % | 60 % | 55 % |

*Přesnost* je podíl nominací respektive hlasů pracantů, které zamířily na sabotéra. Náhodný výběr by dal
asi 29 % (při 8 hráčích).

- **Vězňovo dilema funguje.** Dvojitá sabotáž je vzácná (4 až 12 % padlých šicht), protože se sabotéři
  v modelu dělí o kazení a zkušení to řeší konvencí. To je záměr z §3.3, ale chování sabotérů je tu model.
- **Odměny jsou opravdu rozhodnutí.** Vražda je jen v 39 až 56 % padlých nocí, imunita ve 14 až 35 %, tma
  v 3 až 7 %. Bojazlivá obava z §3.2.1 („kdyby brali vraždu pokaždé…“) se nepotvrzuje. Pozor: tohle je
  model chování sabotérů, ne měření.
- **Při každé hře se vyhostí víc nevinných než sabotérů** (poměr 1,2 až 1,6 : 1). Počítá se s tím, že to
  tak je, ale stojí za to na playtestu sledovat, jak se to hráčům žije.

---

## 4. Různé stoly

Podíl výher pracantů v procentech. Každé políčko 2500 partií (± asi 2 body).

| Stůl | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|
| Nesourodá parta | 87 | 44 | 29 | 35 | 38 | 32 | 34 | 31 |
| Rodinná večeře | 84 | 42 | 29 | | | | | |
| Kamarádi na chatě | | 41 | 25 | 32 | 34 | 27 | | |
| Deskoherní klub | | 47 | 26 | 30 | 35 | | | |
| Firemní teambuilding | | | | 35 | 40 | 35 | 36 | 34 |
| Večírek po pár pivech | | | 22 | 27 | 30 | 22 | 25 | 20 |
| Školní parta | | | | 30 | 33 | 28 | 29 | 26 |
| První hra, nikdo ji nezná | 76 | 35 | 23 | 28 | 33 | 29 | | |
| Analytický tým | | 50 | 28 | 33 | 40 | 32 | | |
| Dominanti a tichošlápci | | | 29 | 35 | 38 | 30 | 32 | |

- **Večírek po pár pivech je nejhorší stůl pro pracanty** (20 až 30 %). Rada bez vyhoštění je tu
  20 až 24 % (jinde 7 až 20 %).
- **Zkušení deskovkáři nejsou lehčí stůl pro pracanty** (26 až 47 %, od směsi se liší jen o ±4 body).
  Veteráni (Marek, Pavel, Filip, Šárka) jsou dobří pracanti, ale ještě lepší sabotéři, takže jejich
  přítomnost pracantům nepomůže (kapitola 5).
- **Analytický tým se od směsi liší jen při 6 a 9 hráčích** (+6 a +2 body), jinak ne. Dedukce sama
  nestačí, protože sabotéři lžou a lži se dedukcí nezachytí.
- **Firma vychází o 0 až 3 body líp než směs** (34 až 40 % při 8 až 12 hráčích). Mechanismus jsem nezkoumal.
- **První hra vychází o 3 až 11 bodů hůř než směs** (pětka 76 % místo 87 %, šestka 35 % místo 44 %).
  Propad je největší u malých stolů, kde jedna chyba v dedukci rozhoduje.
- **Rodina a školní parta** jsou v pásmu směsi. Rodinná večeře se pětkou (84 %) blíží tréninkové partii.

---

## 5. Kdo pomáhá a kdo škodí

Náhodné stoly 6 až 12 hráčů, 42 000 partií. Pro každou personu: jak často vyhrál její tým, když seděla
jako pracant, a když byla sabotér. Rozdíl proti průměru je v bodech (průměr pracantů 34,4 %, sabotérů 65,4 %).

### Jako pracant

| Persona | Tým vyhrál | Δ | Přežil | Vyhoštěn nevinně | Zavražděn | Přesnost nominací |
|---|---|---|---|---|---|---|
| Marek (Veterán) | 38,8 % | +4,4 | 52 % | 24 % | 24 % | 64 % |
| Jana (Megafon) | 38,5 % | +4,2 | 57 % | 21 % | 22 % | 57 % |
| Pavel (Lhář) | 38,1 % | +3,8 | 54 % | 22 % | 23 % | 60 % |
| Zdeněk (Šéf) | 38,1 % | +3,8 | 54 % | 23 % | 24 % | 61 % |
| Filip (Soutěživec) | 37,7 % | +3,3 | 51 % | 27 % | 22 % | 60 % |
| Šárka (Čtenářka lidí) | 36,7 % | +2,3 | 50 % | 30 % | 20 % | 66 % |
| Martin (Diplomat) | 36,5 % | +2,1 | 53 % | 28 % | 19 % | 64 % |
| Radek (Mstitel) | 36,0 % | +1,7 | 51 % | 30 % | 19 % | 59 % |
| Tomáš (Excel) | 36,0 % | +1,6 | 52 % | 29 % | 19 % | 65 % |
| Dana (Červenající) | 35,1 % | +0,7 | 50 % | 34 % | 16 % | 64 % |
| Ondra (Paranoik) | 34,1 % | −0,3 | 45 % | 35 % | 21 % | 60 % |
| Kuba (Šašek) | 33,2 % | −1,2 | 50 % | 32 % | 18 % | 52 % |
| Božena (Babi) | 32,7 % | −1,7 | 51 % | 36 % | 13 % | 70 % |
| Lenka (Nováček) | 32,4 % | −2,0 | 48 % | 39 % | 13 % | 59 % |
| Hanka (Ovečka) | 32,0 % | −2,4 | 46 % | 42 % | 12 % | 62 % |
| Eliška (Důvěřivka) | 31,8 % | −2,6 | 50 % | 38 % | 13 % | 67 % |
| Vojta (Puberťák) | 31,4 % | −3,0 | 45 % | 39 % | 15 % | 50 % |
| Petr (Mlčenlivý) | 30,4 % | −3,9 | 41 % | 47 % | 12 % | 61 % |
| Ivo (Ať to skončí) | 29,5 % | −4,8 | 39 % | 49 % | 11 % | 61 % |
| Tereza (Do mobilu) | 28,6 % | −5,7 | 41 % | 49 % | 11 % | 58 % |

### Jako sabotér

| Persona | Tým vyhrál | Δ | Vyhoštěn | Kazil za partii |
|---|---|---|---|---|
| Pavel (Lhář) | 79,7 % | +14,2 | 36 % | 1,07 |
| Marek (Veterán) | 77,5 % | +12,1 | 38 % | 0,96 |
| Zdeněk (Šéf) | 75,7 % | +10,3 | 48 % | 1,20 |
| Jana (Megafon) | 74,9 % | +9,5 | 47 % | 1,11 |
| Filip (Soutěživec) | 74,0 % | +8,6 | 46 % | 1,20 |
| Martin (Diplomat) | 70,1 % | +4,7 | 51 % | 0,85 |
| Radek (Mstitel) | 69,9 % | +4,5 | 54 % | 1,11 |
| Šárka (Čtenářka lidí) | 69,7 % | +4,3 | 51 % | 0,95 |
| Kuba (Šašek) | 66,2 % | +0,8 | 57 % | 0,99 |
| Tomáš (Excel) | 66,1 % | +0,7 | 60 % | 0,73 |
| Ondra (Paranoik) | 66,0 % | +0,6 | 58 % | 1,12 |
| Dana (Červenající) | 59,4 % | −6,0 | 69 % | 0,71 |
| Hanka (Ovečka) | 59,3 % | −6,1 | 65 % | 0,69 |
| Vojta (Puberťák) | 58,8 % | −6,6 | 65 % | 0,91 |
| Eliška (Důvěřivka) | 58,7 % | −6,7 | 67 % | 0,66 |
| Petr (Mlčenlivý) | 58,5 % | −6,9 | 62 % | 0,77 |
| Lenka (Nováček) | 58,3 % | −7,1 | 69 % | 0,72 |
| Božena (Babi) | 58,0 % | −7,4 | 67 % | 0,57 |
| Ivo (Ať to skončí) | 57,0 % | −8,4 | 65 % | 0,71 |
| Tereza (Do mobilu) | 50,9 % | −14,5 | 70 % | 0,57 |

Co z toho plyne:

- **Rozptyl je u sabotérů trojnásobný.** Pracanti: −5,7 až +4,4 bodu. Sabotéři: −14,5 až +14,2.
- **Hlasití a přesvědčiví pomáhají svému týmu, ať je to jakýkoli tým.** Jana a Zdeněk jsou
  dobří pracanti i dobří sabotéři, protože stůl jde za nimi. **Tohle je silný předpoklad modelu** (rozprava
  sbližuje názory k váženému průměru): kdyby hlasití lidé byli jako pracanti častěji vedle, výsledek
  by se obrátil.
- **Lhaní rozhoduje o sabotérovi.** Pavel (lhaní 0,95) je +14 bodů, Dana (0,05) −6 a v 69 % partií
  ji vyhostí. Čtení lidí (Šárka 0,9) pomáhá mírně: +2,3 jako pracant.
- **Tereza a Ivo jsou obětní beránci.** Nepozorní a netrpěliví jsou jako pracanti vyhoštěni v 49 % partií,
  Petr 47 %. Tichý hráč, který se nebrání, nemá nikoho, kdo by ho hájil. To je zároveň otázka
  férovosti, ne jen vyvážení.
- **Tereza jako sabotér vyhrává jen 51 %.** Stihne asi 70 % tahů, kazí o třetinu míň a jako předák
  ztrácí noci, protože odměnu nevybere.

---

## 6. Dvojice sabotérů

Osm hráčů, dva sabotéři, všech 190 dvojic person, 500 partií na dvojici. Zbylá sedadla losovaná z celé party.

**Nejsilnější dvojice**

| Dvojice | Sabotéři vyhrají | Minut | Kol |
|---|---|---|---|
| Marek + Pavel | 92 % | 25 | 3,9 |
| Pavel + Zdeněk | 88 % | 25 | 3,9 |
| Jana + Pavel | 87 % | 25 | 3,9 |
| Jana + Marek | 87 % | 25 | 3,8 |
| Pavel + Filip | 87 % | 25 | 3,8 |
| Pavel + Šárka | 87 % | 25 | 3,8 |

**Nejslabší dvojice**

| Dvojice | Sabotéři vyhrají | Minut | Kol |
|---|---|---|---|
| Lenka + Tereza | 36 % | 23 | 3,0 |
| Tereza + Ivo | 36 % | 23 | 3,0 |
| Lenka + Ivo | 37 % | 23 | 3,1 |
| Tereza + Božena | 37 % | 23 | 3,1 |
| Božena + Ivo | 38 % | 23 | 3,1 |
| Dana + Tereza | 38 % | 23 | 3,1 |

Průměr přes všechny dvojice je 62 %, rozptyl **36 až 92 %**. Zbylý stůl je přitom pokaždé z téže směsi, takže
tenhle rozptyl nese jen to, kdo sabotéři jsou. Je to největší zdroj nevyváženosti, který v datech je,
a **nedá se ladit pravidly**, protože role losuje aplikace.

---

## 7. Sestavy: počet sabotérů a limit šicht

Co by dala jiná sestava na náhodném lidském stole. Řádky s limitem „dnes“ jsou stejné jako v kapitole 3,
rozdíl 2 až 4 body je šum losování (1500 partií na políčko, ± 2,5).

| Hráčů | Sab. | Limit o 1 menší | **Limit dnes** | Limit o 1 větší | Limit o 2 větší |
|---|---|---|---|---|---|
| 6 | 2 | L3: 30 % (22 min) | **L4: 48 % (26 min)** | L5: 58 % (28 min) | L6: 62 % (30 min) |
| 7 | 2 | L2: 13 % (17 min) | **L3: 33 % (24 min)** | L4: 54 % (28 min) | L5: 67 % (31 min) |
| 8 | 2 | L2: 15 % (18 min) | **L3: 38 % (24 min)** | L4: 60 % (29 min) | L5: 76 % (32 min) |
| 9 | 3 | L5: 28 % (41 min) | **L6: 41 % (45 min)** | L7: 49 % (47 min) | L8: 53 % (48 min) |
| 10 | 3 | L4: 17 % (37 min) | **L5: 32 % (43 min)** | L6: 45 % (48 min) | L7: 56 % (51 min) |
| 11 | 3 | L4: 20 % (38 min) | **L5: 34 % (45 min)** | L6: 51 % (49 min) | L7: 64 % (53 min) |
| 12 | 4 | L6: 22 % (56 min) | **L7: 32 % (61 min)** | L8: 42 % (65 min) | L9: 49 % (67 min) |

- **Jedno kolo je 8 až 22 bodů.** Počet sabotérů je hrubší páka: o jednoho víc nebo míň posune výhru
  o 30 až 60 bodů (jeden sabotér při 6 až 8 hráčích dává 94 až 98 % pracantů, tři při 7 hráčích 3 až 9 %).
- **Pokud je cílem 40 až 55 % na lidských stolech**, vychází jako nejbližší: 6 hráčů **L4** (dnes, 48 %),
  7 hráčů **L4** (54 %), 8 hráčů **L3 nebo L4** (38 % nebo 60 %, mezi nimi nic není), 9 hráčů **L6 až L7**
  (41 až 49 %), 10 hráčů **L6** (45 %), 11 hráčů **L6** (51 %), 12 hráčů **L8 až L9** (42 až 49 %).
  Cena je 4 až 5 minut navíc.
- Cíl 40 až 55 % je moje volba, ne pravidlo. Bot v §3.1 cílil na 35 až 60 % a lidé vycházejí na spodním
  okraji pásma i pod něj. Co je správný cíl pro skutečné lidi, nerozhodne simulace.

---

## 8. Nastavení hry

Náhodné stoly, 3000 partií na políčko.

| Nastavení | 6 | 8 | 10 | 12 | Limit padne (8) |
|---|---|---|---|---|---|
| výchozí | 46 % | 33 % | 32 % | 29 % | 67 % |
| bez nočních vražd | 36 % | 25 % | 24 % | 22 % | 75 % |
| sabotér bez šeptandy (špionská varianta) | 46 % | 37 % | 33 % | 33 % | 63 % |
| obojí | 36 % | 28 % | 25 % | 24 % | 72 % |

- **Bez vražd pracanti ztrácejí 7 až 10 bodů.** Důvod jsem změřil: padlé noci zůstávají stejně časté
  (1,28 za partii), ale odměnou je pak jen imunita (71 %) a tma (15 %). Imunita zablokuje celou radu
  a při limitu 3 až 5 kol je to třetina hry. Pracanti si navíc kvůli ní vyhostí víc nevinných
  (1,62 oproti 1,43 na partii).
- **Špionská varianta pracantům mírně pomáhá (0 až +4 body).** Sabotér bez věty si musí vymyslet všechno
  a nemá po ruce pravdivou, neškodnou větu, kterou by mohl sdílet. Rozdíl je u malých stolů na hraně šumu.
- **Dvojice obou voleb to nevyrovná.** Bez vražd a bez šeptandy pro sabotéry vychází 36 / 28 / 25 / 24 %, tedy
  pořád pod výchozím nastavením (46 / 33 / 32 / 29 %). Komentář u `vrazdy` v `types.ts` i `design.md` §3.5e
  doporučují vypnuté vraždy jako protiváhu k silným sabotérům nebo k špionské variantě; simulace říká,
  že vypnuté vraždy sabotéry **posilují**.

---

## 9. Večer pěti partií

Stejný stůl pět partií po sobě; mezi nimi se každý trochu zlepší (dedukce, paměť, čtení lidí, lhaní,
znalost pravidel).

| Hráčů | 1. | 2. | 3. | 4. | 5. | Minut (1.) | Minut (5.) |
|---|---|---|---|---|---|---|---|
| 6 | 45 % | 39 % | 42 % | 40 % | 42 % | 26 | 27 |
| 8 | 38 % | 35 % | 33 % | 32 % | 31 % | 24 | 25 |
| 10 | 30 % | 31 % | 32 % | 29 % | 30 % | 43 | 43 |

**Zkušenost nepomáhá pracantům.** Zlepšují se obě strany a sabotéři pravděpodobně získávají víc, protože
se zlepšují i ve znalosti pravidel (poslední kolo bez sabotáže) a v domluvě bez slov. Jestli to platí i u lidí, kteří se po
třech partiích znají, je playtest, ne simulace. V modelu se lidé navzájem neznají, takže „já vím,
že Honza vždycky koktá“ tu chybí a to by pracantům naopak pomohlo.

---

## 10. Citlivost modelu

Kolik dá výsledek, když se posune jedna konstanta. Náhodné stoly, 2500 partií na políčko.

| Úprava modelu | 6 | 8 | 10 | 12 | Rozdíl (průměr) |
|---|---|---|---|---|---|
| výchozí model | 44 % | 35 % | 32 % | 30 % | |
| nikdo nepozná lež | 40 % | 29 % | 26 % | 22 % | −6 |
| čtení lidí dvojnásobné | 48 % | 39 % | 39 % | 37 % | +6 |
| **rozprava nic nemění** | 31 % | 21 % | 17 % | 17 % | **−14** |
| rozprava dvakrát silnější | 43 % | 36 % | 35 % | 30 % | +1 |
| poloviční šum intuice | 45 % | 35 % | 32 % | 31 % | +1 |
| šum o polovinu větší | 43 % | 33 % | 31 % | 28 % | −1 |
| **sabotéři nelžou** | 50 % | 44 % | 43 % | 46 % | **+10** |
| sabotéři lžou jen v polovině případů | 47 % | 38 % | 38 % | 38 % | +5 |
| pracanti věří tvrzením čtvrtinově | 48 % | 35 % | 36 % | 37 % | +3 |
| pracanti věří tvrzením dvojnásobně | 41 % | 30 % | 27 % | 25 % | −4 |
| sabotéři hrají hloupě | 46 % | 39 % | 37 % | 35 % | +4 |
| sabotéři lžou hůř | 49 % | 41 % | 37 % | 33 % | +5 |

- **Pořadí velikostí je stejné ve všech variantách.** Šestka je vždy nejlepší pro pracanty, dvanáctka nebo
  desítka nejhorší; „která sestava je vůči které náročná“ se nemění.
- **Úroveň se mění od 17 % do 50 %.** Nejcitlivější jsou dvě věci: **jestli rozprava skutečně sjednocuje
  stůl** a **jestli sabotéři ve šeptandě lžou.** To jsou dvě věci, které se nejlépe ověří u skutečného
  stolu: kolik lidí při hlasování nominuje stejného člověka a kolik lží se ve šeptandě objeví.
- **Lhaní ve šeptandě stojí pracanty asi 10 bodů** (rozdíl mezi „sabotéři nelžou“ a výchozím modelem).
  Víc v poznámce níže.
- **Šum intuice skoro nic nemění** (±1 bod). Surový šum totiž rozprava zprůměruje.

**Poznámka k šeptandě.** Při ladění modelu jsem zkoušel dokonalého robota, kterému sabotéři v každém kole
lžou. Na osmi hráčích vyhrává asi 30 %, zatímco když sabotéři mlčí, 60 %. Starý simulátor lži vůbec
nemodeloval (komentář v `balance-sim.mjs` u šeptandy: pracanti si „sabotérské lži bezchybně zahodí“).
Tvrzení z `design.md` §9, že šeptanda je „nejsilnější laditelná páka pro pracanty“ (+8 bodů), tedy
platí pro svět, kde sabotéři nelžou. Lidští sabotéři lžou jen občas, proto je rozdíl v tabulce výše
menší, ale pořád zhruba 10 bodů.

---

## 11. Nálezy a co s nimi

Seřazeno podle toho, jak moc se na nich dá postavit rozhodnutí. Nic z toho jsem do hry nezapracoval.

| # | Nález | Jistota | Navrhované kroky |
|---|---|---|---|
| 1 | Lidské stoly jsou o 2 až 17 bodů pod botem z §3.1 (nejvíc při 7, 10 a 11 hráčích). Sestavy jsou na lidi pro pracanty těžké (29 až 38 % při 7 až 12 hráčích). | střední: úroveň je odhad, směr drží | Na playtestu změřit výhru pracantů při 7 až 10 hráčích. Pokud je pod 35 %, přidat kolo (kapitola 7). |
| 2 | Časový limit rozhoduje 55 až 69 % partií při 7, 8, 10, 11 a 12 hráčích. | vysoká: nezávisí na úrovni | Zkontrolovat §10 bod 5 („přišel limit dřív, než hra dospěla?“). Pokud ano, limit +1. |
| 3 | Vypnuté vraždy dávají navrch sabotérům. | vysoká: změřený mechanismus | Opravit komentář u `vrazdy` v `types.ts` a `design.md` §3.5e, neradit tuhle volbu jako protiváhu. |
| 4 | Role losuje aplikace a rozptyl dvojic sabotérů je 36 až 92 %. | vysoká | Nelze ladit pravidlem. Vědět o tom: dvě „špatné“ partie za sebou nejsou důkaz o nevyváženosti. |
| 5 | Mlčící a nepozorní hráči jsou v 47 až 49 % partií nevinně vyhoštěni (hlasití 21 až 24 %). | střední: mechanismus je předpoklad modelu | Sledovat na playtestu, kdo odchází první. Pokud to jsou tiší hráči, je to otázka férovosti, ne vyvážení. |
| 6 | Sabotáž v posledním kole nic nepřináší. Zkušení to vědí a nesabotují, nezkušení ano. | vysoká: z pravidel | Buď záměr (zkušenost se vyplácí), nebo mezera. Aplikace může v posledním kole předáka upozornit, že odměna nic nezmění. |
| 7 | Lhaní ve šeptandě stojí pracanty asi 10 bodů. Předpoklad „sabotéři nelžou“ v §9 platí jen v simulaci. | střední | Při playtestu sledovat, kolik vět je pravdivých. Do návodu zvážit radu „věta, kterou potvrdí druhý, váží víc“. |
| 8 | 8 hráčů: 24 minut, ne 45 až 60; 5 hráčů 15 minut, ne 25 až 30. | střední: počítá se bez šatny | Opravit hlavičku `design.md` a `jak-hrat.md` (tam je „45 minut až hodinu“ pro 8 až 12). |
| 9 | Pětka: 87 % pracantů. | střední | Zůstává tréninková, dá se tak i označit. |

### Co ověřit na playtestu

Hypotézy, které simulace předpovídá. Když skutečný stůl vyjde jinak, je to informace o tom, kudy model chybuje.

- Výhra pracantů při 8 hráčích kolem 36 % (rozumné rozpětí z kapitoly 10: 20 až 45 %).
- Limit šicht rozhodne dvě třetiny partií při 7, 8, 10 a 11 hráčích.
- Při 8 hráčích se vyhostí 1,1 sabotéra a 1,4 nevinného za partii.
- Dvojitá sabotáž je vzácná (asi 5 % padlých šicht).
- V polovině padlých nocí se vybere vražda, ve čtvrtině imunita.
- V 15 % rad nikdo neodejde.
- 8 hráčů zabere asi 24 minut hry, 10 hráčů 43, 12 hráčů 62.

---

## 12. Co se nemodeluje

- **Odpojení, pauzy, vynechané tahy ze špatného signálu.** Nepozornost (Tereza) je modelovaná, výpadek
  spojení ne.
- **Rozprava jako konverzace.** Slyší se vždy všichni, nikdo nikoho nepřerušuje, nikdo neudělá scénu.
  Skutečné rozpravy mají tendenci se uzamknout na prvním obviněném.
- **Znalost lidí z minulých partií.** Hráči si nepamatují, jak kdo lže.
- **Nálada během večera**, únava, hlad, alkohol (jen jako konstantní úprava u jednoho stolu).
- **Vztahy mimo hru** kromě jedné nebo dvou dvojic, které si věří.
- **Stoly nad 12 hráčů** a režimy nad rámec dvou voleb v nastavení.
- **Sociální inteligence nad rámec rysů.** Dvacet person je dvacet obrazů, ne dvacet lidí.

Rysy jsou odhad a jsou v [persony/persony.ts](persony/persony.ts). Když se při playtestu ukáže, že
některá persona je ve skutečnosti jinak, jde ji přepsat a pokus spustit znovu.

---

## 13. Ukázka jedné partie

Devět hráčů (Marek, Jana, Petr, Lenka, Kuba, Dana, Ondra, Hanka, Zdeněk), dvojice kamarádů Lenka a Hanka.
Sabotéři: Petr, Kuba, Dana. Limit 6 kol.

```
kolo 1   rozprava: 6 tvrzení (1 lež), mluví 4      vyhoštěna Dana (sabotér)
kolo 2   rozprava: 4 tvrzení, mluví 9               vyhoštěna Jana (pracant)    noc: nic
kolo 3   rozprava: 3 tvrzení, mluví 7               nikdo nevyhoštěn
kolo 4   rozprava: 4 tvrzení, mluví 7               vyhoštěn Petr (sabotér)
kolo 5   rozprava: 4 tvrzení, mluví 8               vyhoštěn Marek (pracant)
kolo 6   rozprava: 3 tvrzení, mluví 1, zkráceno     vyhoštěn Kuba (sabotér)
konec: pracanti, poslední sabotér je pryč (50 minut)
```

Pracanti chybují dvakrát (vyhostí Janu a Marka) a vyhrávají až v posledním kole. V kole 3 se rada
nedohodla a nikdo neodešel.
