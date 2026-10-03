# Krvavka a Šichta: stejní lidé, dvě hry

**Stav:** 2026-10-03 · **Nástroj:** [persony/krvavka.ts](persony/krvavka.ts), [persony/spust-krvavka.ts](persony/spust-krvavka.ts)
· **Souvisí s:** [simulace-persony.md](simulace-persony.md)

Cíl: zjistit, jak je vyvážená Blood on the Clocktower (scénář Trouble Brewing), a tím zároveň
ověřit model person ze Šichty. Krvavku jsem odehrál **stejnými dvaceti personami, stejnými stoly
i stejnými velikostmi**, jen s jiným enginem hry.

## Co se simuluje

Engine Trouble Brewing podle pravidel: 22 rolí (13 Townsfolk, 4 Outsideři, 4 přisluhovači a Imp), sestavy
5 až 12 hráčů včetně Barona, noční informace všech informačních rolí, Travič, Mnich, Imp s předáním
a zabitím, Panna, Zabiják, Voják, Starosta, Svatý, Šarlatová žena, Komorník, Opilec, Poustevník, Špión.
Nominace, hlasování s prahem „aspoň polovina živých“, hlasy duchů (jeden na hru), poprava, konec hry.
Vypravěč je neutrální: falešné informace, červený sled, bluffy a to, jak se Poustevník nebo Špión „jeví“,
určuje náhoda. Zlí bluffují (volí roli z nepoužitých, vymýšlejí si informace, zkušení si „očišťují“ sousedy).

Rozhodování hráčů je **tentýž model jako ve Šichtě**: vlastní mysl nad všemi možnými zlými týmy (hypotézy
„kdo je zlý a kdo je démon“), stopy se zpracovávají podle `analytika` a `pamet`, cizí tvrzení jako Bayesovská
stopa (dobrý nelže, zlý řekne cokoli), čtení lidí proti lhaní, rozprava jako sbližování názorů, nominace
a hlasy podle odvahy, pomsty, přátelství, trollování, nepozornosti.

**Zjednodušení.** Soukromé rozhovory jsou nahrazené veřejným sdílením (to je u Krvavky velký rozdíl),
Špión zná všechny role jen pro vlastní bluffy, Komorník hlasuje po pánovi, Poustevník a Špión se jeví jako
druhá strana v polovině dotazů. Čas je odhad (denní rozprava 8 až 12 minut, nominace po 100 sekundách,
noc 3 minuty plus 25 sekund na živého).

## Výsledky na náhodných stolech

Výhra dobrých, 4000 partií na velikost. U 5 až 6 hráčů je Krvavka mimo rozsah, ve kterém se běžně hraje (od sedmi hráčů výš).

| Hráčů | Zlých | Dobří vyhrají | ± | Démon popraven | Zbyli dva živí | Svatý | Dní | Minut |
|---|---|---|---|---|---|---|---|---|
| 5 | 2 | 23,2 % | 1,3 | 21 % | 73 % | 4 % | 2,1 | 33 |
| 6 | 2 | 27,8 % | 1,4 | 27 % | 62 % | 10 % | 2,5 | 40 |
| 7 | 2 | 48,2 % | 1,5 | 46 % | 49 % | 3 % | 3,1 | 52 |
| 8 | 2 | 50,6 % | 1,5 | 49 % | 42 % | 8 % | 3,6 | 62 |
| 9 | 2 | 49,5 % | 1,5 | 47 % | 39 % | 11 % | 4,4 | 96 |
| 10 | 3 | 40,0 % | 1,5 | 39 % | 53 % | 7 % | 4,6 | 105 |
| 11 | 3 | 42,3 % | 1,5 | 41 % | 45 % | 13 % | 5,1 | 121 |
| 12 | 3 | 45,6 % | 1,5 | 44 % | 39 % | 15 % | 5,7 | 136 |

**Při 7 až 12 hráčích vychází 40 až 51 % pro dobré.** Autoři uvádějí ze zhruba 600 zaznamenaných
partií Trouble Brewing rozdíl mezi týmy kolem 1 %, tedy asi 50 : 50. Skutečné hry jsou ale
za zkušených vypravěčů a hráčů, moje persony jsou smíšená společnost, takže přesná shoda by byla náhoda.
Podstatné je, že **model person, který jsem nijak neladil na Krvavku, dává u hry považované za vyváženou
hodnoty kolem poloviny.** U Šichty dával 29 až 38 %.

### Srovnání se Šichtou

| Hráčů | Šichta: pracanti | Krvavka: dobří | Rozdíl | Šichta minut | Krvavka minut |
|---|---|---|---|---|---|
| 5 | 87 % | 23 % | | 15 | 33 |
| 6 | 44 % | 28 % | | 26 | 40 |
| 7 | 29 % | 48 % | −19 | 24 | 52 |
| 8 | 36 % | 51 % | −15 | 24 | 62 |
| 9 | 38 % | 50 % | −12 | 45 | 96 |
| 10 | 33 % | 40 % | −7 | 43 | 105 |
| 11 | 34 % | 42 % | −8 | 45 | 121 |
| 12 | 31 % | 46 % | −15 | 62 | 136 |

- **Šichta je nakloněná sabotérům o 7 až 19 bodů víc než Krvavka zlým** při 7 až 12 hráčích.
- **Šichta zvládá malé stoly, které Krvavka nezvládá.** Šestka (44 %) je ve Šichtě vyvážená, v Krvavce
  (28 %) ne. U pěti je to naopak: Šichta moc pro pracanty (87 %), Krvavka moc pro zlé (23 %).
- **Šichta trvá zhruba poloviční dobu** (24 až 62 minut proti 52 až 136).
- **Vyhoštění nevinného je podobně časté.** V Krvavce se popraví 1,1 až 2,0 dobrých na partii, ve Šichtě
  1,4 až 3,2 (kolo za kolem se hlasuje povinně), takže je Šichta trochu nemilosrdnější.

## Typy stolů

Výhra dobrých v procentech, 2500 partií na políčko.

| Stůl | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|
| Nesourodá parta | 23 | 28 | 48 | 50 | 48 | 41 | 43 | 45 |
| Rodinná večeře | 24 | 25 | 43 | | | | | |
| Kamarádi na chatě | | 26 | 44 | 46 | 48 | 35 | | |
| Deskoherní klub | | 30 | 54 | 54 | 54 | | | |
| Firemní teambuilding | | | | 46 | 49 | 37 | 41 | 46 |
| Večírek po pár pivech | | | 38 | 41 | 41 | 28 | 30 | 32 |
| Školní parta | | | | 41 | 42 | 29 | 35 | 38 |
| První hra, nikdo ji nezná | 19 | 24 | 36 | 39 | 41 | 27 | | |
| Analytický tým | | 34 | 57 | 57 | 55 | 46 | | |
| Dominanti a tichošlápci | | | 43 | 45 | 47 | 33 | 39 | |

Rozdíl proti Šichtě: **v Krvavce zkušení hráči pomáhají dobrým** (deskovkáři 54 %, analytici 55 až 57 %),
ve Šichtě ne (kapitola 4 hlavního reportu). Pravděpodobný důvod je v povaze her: v Krvavce se tvrzení dají křížově kontrolovat a zkušení to umějí,
ve Šichtě sabotér lže o věcech, které se dedukcí nezachytí. Nezkoumal jsem to.

## Persony

Jako dobrý: −3,4 až +5,5 bodu proti průměru (Marek +5,5, Pavel +5,3, Eliška −3,4, Lenka −3,3).
Jako zlý: −9,2 až +14,7 (Pavel +14,7, Marek +10,1, Dana −9,2, Božena −8,1, Lenka −7,7).

| | Šichta | Krvavka |
|---|---|---|
| Rozptyl person jako dobrý | −5,7 až +4,4 | −3,4 až +5,5 |
| Rozptyl person jako zlý | −14,5 až +14,2 | −9,2 až +14,7 |
| Nevinně popraveni: nejméně / nejvíc | 21 % / 49 % | 15 % / 27 % |
| Nejlepší zlý | Pavel (80 %) | Pavel (71 %) |
| Nejhorší zlý | Tereza (51 %) | Dana (47 %) |

Profily jsou si překvapivě podobné. Rozdíl: **tichí a nepozorní jsou ve Šichtě mnohem víc terčem** (až 49 %
nevinně vyhoštěných proti 27 % v Krvavce). Pravděpodobně proto, že v Krvavce má každý roli a informace, které může hájit a sdílet,
zatímco ve Šichtě tichý hráč nemá co dodat.

## Dovednost

| Zlí \ Dobří | zkušení dobří | nezkušení dobří |
|---|---|---|
| **zkušení zlí** | 45 % výhra zlých | 91 % |
| **nezkušení zlí** | 24 % | 63 % |

Samí nezkušení: dobří 39 %. Jeden zkušený dobrý mezi nimi: 56 % (+17 bodů). Ve Šichtě: 97 / 65 / 75 / 31 %
a 26 → 44 % (+18). **Obě hry jsou na dovednost stejně citlivé.** V Krvavce jsou ale stejně dobré týmy
blíž vyrovnané (zlí vyhrávají 45 % mezi zkušenými a 63 % mezi nezkušenými), ve Šichtě sabotéři vedou i mezi
stejně dobrými (65 % a 75 %).

## Délka rozpravy

Výhra dobrých a čas hry podle délky denní rozpravy (násobek výchozí):

| Hráčů | ×0,5 | ×0,75 | ×1 | ×1,5 | ×2 |
|---|---|---|---|---|---|
| 7 | 37 % (43 min) | 43 % (47 min) | 48 % (53 min) | 49 % (65 min) | 49 % (78 min) |
| 8 | 37 % (54 min) | 44 % (59 min) | 49 % (63 min) | 50 % (79 min) | 49 % (95 min) |
| 10 | 28 % (84 min) | 34 % (95 min) | 39 % (105 min) | 41 % (134 min) | 41 % (161 min) |
| 12 | 33 % (114 min) | 40 % (124 min) | 44 % (134 min) | 45 % (171 min) | 45 % (204 min) |

**V Krvavce je zkrácení rozpravy silná páka proti dobrým** (poloviční rozprava −11 bodů), zatímco
prodloužení za výchozí úroveň už nepomáhá (nasycení). To odpovídá tomu, že vypravěč Krvavky časem rozpravy
přilepšuje nebo přihoršuje dobrému týmu. Ve Šichtě je páka podstatně slabší (poloviční rozprava −0 až −4)
a funguje na obě strany jen jemně.

## Citlivost modelu

| Úprava modelu | 6 | 8 | 10 | 12 | Rozdíl |
|---|---|---|---|---|---|
| výchozí model | 29 % | 50 % | 40 % | 46 % | |
| nikdo nepozná lež | 21 % | 38 % | 26 % | 31 % | −12 |
| čtení lidí dvojnásobné | 34 % | 58 % | 47 % | 54 % | +7 |
| rozprava nic nemění | 28 % | 45 % | 36 % | 41 % | −4 |
| rozprava dvakrát silnější | 27 % | 46 % | 36 % | 42 % | −3 |
| poloviční šum intuice | 29 % | 51 % | 40 % | 46 % | +1 |
| šum o polovinu větší | 29 % | 51 % | 38 % | 45 % | −1 |
| **zlí nebluffují** | 18 % | 29 % | 17 % | 14 % | **−22** |
| zlí bluffují v polovině případů | 23 % | 40 % | 28 % | 35 % | −9 |
| dobří věří tvrzením čtvrtinově | 28 % | 48 % | 38 % | 51 % | 0 |
| dobří věří tvrzením dvojnásobně | 29 % | 48 % | 36 % | 40 % | −3 |
| zlí lžou hůř | 33 % | 57 % | 46 % | 54 % | +7 |

V Krvavce nejvíc rozhoduje **to, jak dobře zlí lžou a jak dobře to dobří čtou**, ne rozprava jako sbližování
názorů (tam, kde Šichta nejvíc citlivá byla). Po úpravě směřují obě hry stejným směrem: čím lepší lhář,
tím víc vyhrávají zlí.

## Večer pěti partií

| Hráčů | 1. | 2. | 3. | 4. | 5. |
|---|---|---|---|---|---|
| 6 | 31 % | 27 % | 27 % | 27 % | 28 % |
| 8 | 48 % | 48 % | 52 % | 43 % | 49 % |
| 10 | 39 % | 40 % | 37 % | 34 % | 41 % |

Stejně jako ve Šichtě: zlepšují se obě strany a dobrým to nepomáhá. Vyvážení Krvavky se během večera
nemění, Šichty mírně (8 hráčů: 38 → 31 %).

## Závěry

1. **Model person je s Krvavkou smysluplný.** Neladěný dává u hry vyvážené podle autorů hodnoty
   40 až 51 %. To je nejsilnější důkaz, který tu je, že 29 až 38 % pro Šichtu nejsou artefakt modelu.
   Není to důkaz, že jsou přesně správně, hlavně proto, že hráči Krvavky mají vypravěče, který hru
   vyvažuje živě, a moje stoly ne.
2. **Šichta je dnes nakloněná sabotérům víc než Krvavka zlým**, o 7 až 19 bodů při 7 až 12 hráčích.
   Nejvíc při sedmi (−19) a osmi (−15) a dvanácti (−15).
3. **Šichta je stejně na dovednost jako Krvavka.** Zkušení vyhrávají nad nezkušenými v obou, o stejně
   dramatický rozdíl. Rozdíl je jen v tom, že ve Šichtě vyhrávají sabotéři víc i při rovné dovednosti.
4. **Jemná páka délky rozpravy z Krvavky se do Šichty přenáší slabě.** To je důsledek toho, že Šichta
   má víc tvrdých informací z mechaniky. Za dobrou vlastnost to považuju: výsledek není tak závislý
   na tom, kdo vede rozpravu.
5. **Krvavka potřebuje dvakrát až třikrát víc času.** Šichta stejné množství rozhodnutí odbaví za
   polovinu, což je pro hru bez vypravěče výhoda.

## Co se nemodeluje

Soukromé rozhovory (v Krvavce zásadní, tady nahrazené veřejným sdílením), složité interakce rolí
(Špión a Opilec s Poustevníkem), vypravěč jako člověk, který hru vyvažuje živě (pomáhá zlým bluffovat,
rozhoduje o pravděpodobnostech), ostatní scénáře (Bad Moon Rising, Sects & Violets), přesná
tempová a časová pravidla. Moje číslo pro Krvavku je proto jen srovnávací bod pro model, ne měření
vyváženosti oficiálního scénáře.

Zdroj údaje o ~50 : 50: oficiální účet hry na X
([Almost a 50/50 win rate for good and evil in Trouble Brewing](https://x.com/BloodClocktower/status/1716760069906502142))
a text autorů
[Behind the Curtain #7: Balance](https://www.tumblr.com/bloodontheclocktower/655025729437925376/behind-the-curtain-7-balance).
