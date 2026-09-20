# Audit aplikace Šichta

Datum: 2026-09-20 · Stav repa: commit `4497454` na `main`, pushnuto, repo veřejné.
Doprovodný seznam úkolů v pořadí oprav: [ukoly.md](ukoly.md). Čísla nálezů (K, U, D) se v něm používají jako odkazy.

Co bylo provedeno: přečtena celá složka (dokumentace, herní jádro, testy, obrazovky, UI, síť, worker, simulátor, pomocné skripty, slepá větev Supabase), spuštěny testy, typecheck, build, integrační test proti nasazenému workeru, dva ověřovací skripty (lokální reducer a živý worker) a průchod hot seat režimem v prohlížeči od úvodu po první šichtu.

> **Stav po opravách (2026-09-20 večer):** všechny nálezy K1 až K17, U1 až U13 a D1 až D6 jsou opravené, viz [ukoly.md](ukoly.md). Otevřené zůstává jen 4.7 (rada bez nominací do šesti živých, čeká na playtest) a vlna 6 (nové funkce). Rozhodnutí R1 až R5 jsou zapsaná tamtéž. Popis chyb níže platí pro stav před opravami, commit `4497454`.

Ověřovací skripty jsou v `scratch/audit-overeni.mts` (reducer, spouští se `npx vite-node scratch/audit-overeni.mts`) a `scratch/audit-online.mjs` (živý worker, spouští se přenosným Node 22). Složka `scratch/` je mimo repo. Jejich tvrzení patří do testů, viz úkol 1.8.

---

## 1. Verdikt

**Záměr je jasně formulovaný a architektura ho drží.** Čistý reducer bez UI, jediná cesta ven přes `pohledPro()`, stejný kód v prohlížeči i v Durable Objectu, testy hrající celé partie, tokeny jako zdroj barev. To je dobře postavené a je to důvod, proč jde většina nálezů níže opravit levně.

**Aplikace ale zatím není připravená na playtest.** Ne kvůli drobnostem, ale kvůli pěti chybám, které zasahují do samotné hry:

| # | Nález | Dopad |
|---|---|---|
| K1 | Online se role rozdávají deterministicky. Dvě různé místnosti se šesti hráči dají vždy sabotéry na 4. a 5. místě v pořadí příchodu, předák je vždy pátý. | Po první partii každý ví, kdo bude sabotér příště. |
| K2 | Odměny Imunita a Tma nic nedělají. Resetují se na začátku dalšího kola, tedy dřív, než přijde rada, na kterou mají působit. Imunita navíc z obrazovky nikdy nedostane cíl. | Ze tří odměn funguje jen Vražda. Padá celá mechanika tempa z §3.2.1. |
| K3 | Vyhoštěný předák zůstává předákem. Vybírá odměnu a vraždí ze záhrobí, živí sabotéři nemají nikoho. | Porušuje §3.4 a dá se to zneužít. |
| K4 | Ve dvou směnách nemá padlá dopolední šichta žádný následek. Noc přijde jen po padlé odpolední. | Sabotéři nemají důvod kazit dopoledne. Týká se 9 a 12 hráčů. |
| K5 | V hot seatu jde v noci telefon nejdřív předákovi, pak sabotérům, pak ostatním. Pořadí „PODEJ TELEFON“ vidí celý stůl. | Hot seat prozradí role každou noc. |

Vedle toho je online režim křehký v tom, na čem stojí: bez wake locku se telefony během rozpravy zamknou, výpadek spojení hru zastaví a po návratu se nikdy neobnoví časovač (K7). Tlačítka na obrazovce Pauza online nefungují (K6).

**Doporučené pořadí:** opravit K1 až K7 (odhadem den práce, vše má jasnou příčinu), doplnit testy na odměny a nástupnictví předáka, sjednotit čísla v `design.md` s `rules.ts`, a teprve pak playtest. Playtest má smysl jen online a s wake lockem, hot seat je do opravy K5 nepoužitelný na skutečnou hru.

---

## 2. Záměr a cíl: čeho bylo dosaženo

### Co sedí

- **Jádro:** 61 testů prochází, typecheck aplikace i workeru bez chyb, build 71 kB gzip JS (rozpočet z `obrazovky.md` je 120 kB). Šeptanda má nezávislý ověřovač pravdivosti a tisíce náhodných her v testech. To je nadstandard.
- **Síť:** nasazený worker odpovídá, integrační test `scripts/test-online.mjs` prochází celý (šatna, role, únik po drátě, připravenost, tajná volba, návrat po výpadku).
- **Hot seat:** průchod v prohlížeči od úvodu přes šatnu, rozdání šesti rolí, předěl kola a zadání šichty proběhl bez chyby v konzoli, časovač fáze se posunul správně.
- **Značka:** tokeny v `brand/` a `src/ui/` jsou shodné, žádné em-dashe v UI, patina a spál se drží pravidla „výsledek, ne člověk“, obě role vidí stejná tlačítka.
- **Bezpečnost pohledu:** role ostatních, cizí šeptanda a cizí volba se ven nedostanou. Ověřeno testy i po drátě.

### Co chybí proti vlastní dokumentaci

Soupis v `obrazovky.md` slibuje 34 obrazovek a `plan-stavby.md` říká „hotovo“. Ve skutečnosti chybí nebo je jen naznačeno:

| Obrazovka | Stav |
|---|---|
| H1 Přehled hry (historie part, výsledků, hlasování) | Neexistuje. Pohled nenese žádnou historii, jen konec hry. Přitom šeptanda říká „v kole 2 byl předák v partě“ a hráč si partu z kola 2 musí pamatovat. |
| H2 Tvá role (připomenutí) | Komponenta `CekaSe` má `onTvaRole`, App ho nikdy nepředá. |
| F3b Čeká se na noc | `CekaNoc` je napsaná, nikde nepoužitá. Online po odeslání zůstává hráč na formuláři. |
| B3 Čeká se (po rozdání, online) | `TvaRole` dostává vždy `pripraven={false}`, po stisku se nic nezmění. |
| G3 Znovu se stejnou partou | Jen `window.location.reload()`, parta se rozpadne. |
| A2/A4 QR kód | Není. Sdílení odkazem funguje. |
| Wake lock (`design.md` §7.3) | Není. |
| Časovač ze serveru (`design.md` §7.3, „nikdy z hodin klienta“) | Pohled nenese konec fáze, klient odpočítává od plné délky. Po návratu z výpadku ukazuje nesmysl. |
| Návrhy oběti pro předáka (`design.md` §3.4) | `NAVRHNOUT_OBET` se ukládá, ale pohled ho nikdy nikomu nevrátí. Obrazovka Oběť předákovi slibuje „Návrhy ostatních vidíš u jmen“. V hot seatu navíc předák rozhoduje dřív, než ostatní navrhují. |

---

## 3. Chyby v herní logice a síti

Vše níže je ověřené spuštěním, ne odhadem.

### K1 · Deterministické role online (kritické)

`worker/index.ts` volá `reducer(this.stav, a)` bez seedu a klient posílá `{ typ: 'ZACIT' }` bez seedu. Reducer má výchozí `seed = 1`, takže `rng(1)` rozdá role pokaždé stejně. Stejné je i losování party a výběr šeptandy (`rng(seed + kolo * 7919 + faze.length)`).

Ověřeno proti živému workeru: místnosti `DH7FC3` a `G6EC8C` (6 hráčů, jiná jména) měly sabotéry `h3, h4` a předáka `h4`. Integrační test projektu to potvrzuje nezávisle (Tomas a Martin, tedy h3 a h4). Při 8 hráčích je to `h3, h6` a první parta `h4, h6, h1, h5`.

Náprava: worker si při založení místnosti vylosuje seed přes `crypto.getRandomValues`, uloží ho do storage a předává ho reduceru. Test „stejný seed dá stejné rozdání“ zůstane, přibude „dvě místnosti bez seedu dají různé rozdání“.

### K2 · Imunita a Tma jsou prázdné (kritické pro hru)

`zacitDalsiKolo()` nastaví `imunita: null, tmaNadHlasovanim: false`. Noc je ale na konci kola a „nejbližší rada“ je v kole následujícím. Efekt se tedy smaže, než může nastat. Ověřeno: po volbě imunity je v ránu `s.imunita = h0`, po předělu dalšího kola `null`; totéž Tma.

Druhá vrstva: App posílá `VYBRAT_ODMENU` bez `cil`, obrazovka Odměny nemá výběr chráněného hráče. I po opravě resetu by imunita neměla koho chránit.

Testy tohle nekryjí: `machine.test.ts` testuje jen, že odměny jsou nabídnuté, ne že působí.

Náprava: resetovat obě hodnoty až po radě (po fázi `hlasy`), přidat výběr cíle imunity, a doporučuji imunitu **veřejně oznámit ráno** („dnes nemůže být vyhoštěna Klára“). Skrytá imunita se stejně prozradí tím, že nominovaný nepostoupí, a veřejná vyrobí hádku, což je přesně cíl principu 1.

### K3 · Mrtvý předák (vysoké)

`odebrat()` jen nastaví `zivy: false`, `s.predak` se nikdy nepřepíše. Pohled dává `jsemPredak` a `odmeny` podle `s.predak === jaId` bez ohledu na život. Ověřeno: vyhoštěný předák dostal nabídku odměn a zavraždil hráče, živý sabotér neměl nic.

Náprava: při vyhoštění předáka posunout funkci na dalšího živého sabotéra podle pořadí sedadel (design to popisuje). Přidat test.

### K4 · Dvě směny bez dopolední odměny (vysoké)

`dostupneOdmeny()` čte jen poslední směnu a noc přijde jen po padlé poslední směně. Design §3.2.2 říká, že padlá dopolední dává na výběr z Imunity a Tmy. Ověřeno na 9 hráčích: dopolední padla se třemi sabotážemi, odpolední prošla, kolo skončilo bez noci, a navíc se rozdala šeptanda.

Náprava: buď postavit dopolední odměnu (noc se dvěma kroky), nebo pro v1 dvě směny vypnout a nechat 9 a 12 hráčů na jedné směně. Druhá cesta je levnější a simulace ukazuje, že rozdíl je 7 až 14 bodů, které se dají dohnat limitem šicht.

### K5 · Pořadí telefonu v noci (kritické pro hot seat)

`useHra.ts`, `frontaProFazi` pro `noc`: `[předák, ostatní sabotéři, pracanti]`. Obrazovka „PODEJ TELEFON“ jde po stole v tomhle pořadí. Stůl tedy každou noc vidí, kdo je předák a kdo sabotér.

Náprava: fronta vždy v pořadí sedadel, všichni dostanou stejně vypadající obrazovku Podezřelý a předák má na svém soukromém kroku navíc odměnu a volbu oběti. Krok „sabotéři navrhují“ v hot seatu vypustit, stejně se nikdy nezobrazí (viz K11).

### K6 · Autorizace akcí ve workeru (vysoké)

`webSocketMessage` kontroluje jen `'id' in a && a.id !== s.hracId`. Akce bez `id` projdou od kohokoliv, akce s cizím `id` neprojdou nikdy. Ověřeno proti živému workeru:

- `ZACIT` od nezakladatele spustí hru.
- `DALSI_FAZE` od libovolného klienta přeskočí fázi (rozdání, rozpravu, cokoliv).
- `HRAT_BEZ_NEJ` a `PRIPOJIL_SE` od zakladatele za odpojeného hráče server zahodí, takže tlačítka ČEKAT DÁL a HRÁT BEZ NĚJ na obrazovce Pauza online nedělají nic.
- Podle kódu projdou od kohokoliv i `VYBRAT_ODMENU`, `PREDAK_ROZHODL` a `ZMENIT_NASTAVENI`.

Repo je veřejné, takže tvar zpráv zná každý, kdo se podívá. Na stole kamarádů to nevadí, ale jde to proti deklarované architektuře „server je jediná pravda“.

Náprava: každá akce dostane `od: HracId` doplněné serverem podle tokenu, reducer sám odmítne akce, které nesedí k roli (předák, zakladatel). Tím se to dostane i do testů.

### K7 · Časovač po pauze umře, wake lock chybí (vysoké)

Podle kódu: po `ODPOJIL_SE` zůstane alarm naplánovaný, vystřelí, `alarm()` kvůli pauze skončí a **nic nenaplánuje**. Po návratu hráče `fetch()` provede `PRIPOJIL_SE`, ale `naplanovatPosun()` nezavolá. Fáze bez hráčských akcí (výsledek, kandidáti, hlasy, vyhoštění, ráno, předěl, zadání) se pak nikdy neposunou. V rozpravě to zachrání jen `CHCI_DAL`, které časovač znovu nastaví na plnou délku.

K tomu: bez wake locku se telefony během 3 až 5 minut rozpravy zamknou. iOS Safari uspaná stránka WebSocket zavře, po 8 vteřinách přijde `ODPOJIL_SE` a pauza pro celý stůl. Telefony leží lícem dolů, takže to nikdo nevidí. Právě fáze, která je srdcem hry, je online nejzranitelnější.

Náprava: `navigator.wakeLock` v aktivních fázích; pauzu vyvolávat jen tam, kde od odpojeného hráče čekáme akci (šichta, nominace, rada, noc), jinak jen indikátor; po každém `PRIPOJIL_SE` a `HRAT_BEZ_NEJ` znovu naplánovat alarm ze zbývajícího času (uložit `konecFaze` do stavu); ten samý údaj poslat v pohledu a odpočet na klientovi kreslit z něj.

### K8 · Pohled pouští víc, než má (střední)

- `stul.hlasy` obsahuje hlasy už během fáze `rada`, tedy před odhalením. Ověřeno.
- `stul.obet` nese oběť už během noci, před ránem. Ověřeno.
- Obrazovky to nekreslí, ale po drátě to je, a `pohled.test.ts` to nehlídá.

### K9 · Šeptanda umí vyrobit důkaz (střední, design)

Rodina `hlas`: „V kole N padl hlas aspoň jednoho sabotéra na: X.“ Hlasy v radě jsou veřejné. Když X dostal v kole N jediný hlas, věta jmenuje sabotéra jednoznačně. Ověřeno na sestrojeném stavu. Rodina `predak` („v kole N byl / nebyl předák v partě“) se s veřejnými partami protíná napříč koly a taky konverguje k jednomu jménu. Obojí je proti principu 2.

Náprava: `hlas` jen pro cíle se dvěma a víc hlasy (nebo jen pro vyhoštěného), `predak` omezit na jednu větu za partii nebo vypustit. Drobnost: věta pro příjemce může jmenovat jeho samého („Určitě není sabotér: ADAM“ pro Adama), stačí ho z výběru vyloučit.

### K10 · Rada bez kvóra (střední, design)

Jediný kandidát a jediný hlas ze šesti živých vede k vyhoštění. Ověřeno. Design říká „při rovnosti nikdo“, ale ne nic o minimu. Doporučuji vyhoštění jen s nadpoloviční většinou odevzdaných hlasů, nebo aspoň s víc než jedním hlasem.

### K11 · Předák nevidí návrhy (střední)

Viz tabulka v §2. Buď návrhy do pohledu předáka přidat, nebo z v1 vypustit a nechat předáka rozhodnout sám. Teď je to poloviční mechanika s falešným slibem na obrazovce.

### K12 až K17 (nízké)

- **K12** Nejlepší čuch počítá i tipy sabotérů. Sabotér, který tipne kolegu, vyhraje cenu jistě. Vyloučit sabotéry.
- **K13** Hlas stínu se utratí jen tehdy, když rada někoho vyhostí (`vyhodnotitRadu`). Design říká „kdykoliv ho použije“. Kód je možná lepší, ale dokument to musí říct.
- **K14** Šatna online: kdo zavře kartu, zůstane v `hraci`. Hra pak začne s fantomem, který nikdy neodevzdá, a pauza se nedá vyřešit (K6). Chybí odebrání odpojených před startem a tlačítko vyhodit.
- **K15** Místnost žije v DO navždy. Doplnit alarm na smazání storage pár hodin po konci.
- **K16** Připojení do rozběhnuté hry novým tokenem: socket se přijme, `hracId` je `null`, klient visí na „Připojuji“ bez zprávy.
- **K17** `ZMENIT_NASTAVENI` má v reduceru dvakrát tutéž podmínku, `worker/index.ts` má v hlavičce zastaralý komentář o GitHub Pages a CORS. Kosmetika.

Latentní riziko: `useOdpocet` volá `onDoslo()` uvnitř updateru `setZbyva`, tedy přesně tam, kde `CLAUDE.md` varuje před dvojím spuštěním ve StrictMode. V průchodu prohlížečem se přeskok neprojevil, ale po vypršení běží interval dál a volá `onDoslo` každou vteřinu, dokud se nezmění fáze. Přesunout do `useEffect` nad `zbyva === 0`.

---

## 4. Obrazovky a UI

| # | Nález | Kde |
|---|---|---|
| U1 | Jména jako klíče v seznamech. Dva hráči MISTR vyvolali v konzoli sérii `Encountered two children with the same key`. Šatna duplicitní přezdívky nehlídá. | `sichta.tsx`, `konec.tsx`, `rada.tsx` |
| U2 | Ráno ukazuje „PO ŠICHTĚ N-1“ od druhého kola. `kolo` se zvedá až po ránu, `Math.max(1, p.kolo - 1)` je o jedna vedle. | `App.tsx` |
| U3 | Kandidáti mají vždy 0 nominací, „nepostupují“ je prázdné. Počty nejsou v pohledu. | `App.tsx`, `pohled.ts` |
| U4 | Poslední slovo: fáze trvá 30 s celkem a jako mluvčí se ukáže jen první kandidát. Text předtím slibuje „oba dostanou třicet vteřin“. Při remíze na druhém místě jsou kandidáti tři i čtyři. | `rada.tsx`, `rules.ts` |
| U5 | Zadání online zvýrazní poslední řádek party, ne mě (`i === parta.length - 1`). | `sichta.tsx` |
| U6 | Zápisník je v hot seatu dostupný i na obrazovkách stolu, kde `ja` je h0. Kdokoliv otevře poznámky prvního hráče. Klíč `hotseat:h0` navíc přežívá do další partie s jiným člověkem na h0. | `App.tsx`, `zapisnik.tsx` |
| U7 | Pauza: „Čeká se už“ je natvrdo 0:00, odpočet je klientský. | `App.tsx` |
| U8 | Předěl: „ZBÝVAJÍ 5 ŠICHTY“ (má být „ZBÝVÁ 5 ŠICHT“), pruh označí aktuální kolo jako odpracované. | `sichta.tsx` |
| U9 | Tlačítko zápisníku překrývá spodní poznámku na Zadání (vidět na screenshotu). | `zapisnik.tsx` |
| U10 | „JEN NA JEDNOM TELEFONU“ se na 375 px láme do dvou řádků a tlačítko je vyšší, než má být. | `lobby.tsx` |
| U11 | Odkrytí role jde jen přes `pointerdown`, klávesnicí ne. Tlačítko NASTAVENÍ v online šatně (`onNastaveni={() => {}}`) nic nedělá. | `role.tsx`, `App.tsx` |
| U12 | iOS nemá `navigator.vibrate`. Haptika, na kterou design spoléhá při telefonech dolů, je jen na Androidu. Zvuk hraje jen zakladatelův telefon, který během rozpravy leží dolů a zamkne se. | `zvuk.ts` |
| U13 | SEO checklist z pravidel workspace není splněný: `robots.txt` a `sitemap.xml` vrací 307, chybí canonical, OG a Twitter meta. | `index.html`, `public/` |

---

## 5. Dokumentace versus kód

| # | Rozpor |
|---|---|
| D1 | **`design.md` §3.1 a `rules.ts` si odporují**, a `CLAUDE.md` přitom říká, že §3.1 je zdroj pravdy, kterou se nesmí měnit od oka. Design: 8 hráčů = 3 sabotéři, limit 6, 2 směny. Kód: 2 sabotéři, limit 3, 1 směna. Design: 6 hráčů limit 3, kód 4. Design: 10 hráčů limit 6 a 2 směny, kód 5 a 1 směna. Design: 12 hráčů limit 7, kód 6. Design nemá řádek pro 11 hráčů. Tabulka pro 5 hráčů říká 2 sabotéři, text hned pod ní říká 1. `scratch/finalni.txt` a `scratch/limity.mjs` mají ještě další sady čísel. |
| D2 | `design.md` §3.2 (fáze 5): rozprava ukazuje historii part a hlasování. `obrazovky.md` a `pruzkum-trhu.md`: přehled je během rozpravy zamčený. Kód: zamčený, a přehled neexistuje vůbec. |
| D3 | `design.md` §3.2.2: dvě směny „při osmi a víc“. Kód: jen 9 a 12. |
| D4 | `design.md` hlavička a §7 popisují Supabase, RPC `get_my_view` a `advance_phase`. Skutečnost je Durable Object. `navod-supabase.md` a `supabase/*.sql` jsou slepá větev, ale dokument to čtenáři neřekne. |
| D5 | `plan-stavby.md` a `CLAUDE.md`: 41 testů. Je jich 61. Fáze 1 a 2 „hotovo“ včetně obrazovek, viz §2. |
| D6 | `balance-sim.mjs` používá v šeptandě `Math.random()` místo seedovaného `rnd()`, takže výsledky nejsou reprodukovatelné mezi běhy. Model šeptandy v simulaci má 3 rodiny z 8 a rozdává je jinak než kód (každému pracantovi vlastní, ne 3 pravdy všem). Čísla v `rules.ts` s poznámkou „přeměřeno po přechodu na individuální šeptandu“ tedy vznikla nad jiným modelem, než jaký hra opravdu používá. |

Doporučení: jeden zdroj pravdy pro sestavy, a to `rules.ts` s komentářem, ze kterého běhu simulace číslo pochází. `design.md` §3.1 buď generovat, nebo z něj tabulku odstranit a odkázat na kód.

---

## 6. Dává hra smysl

**Ano, jádro je zdravé.** Avalonova mise s tvrdou stopou, Zrádcovská noc a hlas stínu z Krvavky se skládají dobře a nový spoj „sabotáž odemyká vraždu“ je nosný. Průzkum trhu je poctivý a správně pojmenovává obě rizika: telefon v ruce a nabalování složitosti. Následující body jsou místa, kde se design buď hádá sám se sebou, nebo kde ho kód nedotáhl.

**1. Telefon v ruce je 55 % kola.** Při 8 hráčích a jedné směně trvá kolo 602 s podle `delkaFaze`, z toho 330 s jsou fáze s telefonem v ruce. Design říká princip 3, ale časy fází ho popírají. Dva levné zásahy: **posunout fázi hned, jakmile všichni odevzdali** (server to vidí, `odevzdali` už v pohledu je, princip 4 zůstává zachovaný, protože odevzdat musí každý), a stolní fáze (výsledek 22 s, hlasy 18 s, vyhoštění 15 s, ráno 15 s, kandidáti 15 s) nechat zakladateli odklepnout jako v hot seatu.

**2. Nabídka odměn se zvrhne na střídání.** Vražda je jediná trvalá odměna. Racionální předák bere Vraždu vždy, když smí, a v mezikole Tmu. Imunita je slabá, protože chrání jednoho hráče na jednu radu a stůl si vybere jiného. Návrh: imunitu zveřejnit ráno (viz K2), tím se z ní stane tah do rozpravy. Alternativně nabídku zúžit na Vraždu a Tmu a nechat cooldown vražd, což je to, co v praxi stejně vznikne.

**3. Nominace plus rada je dlouhá a při malém stole je nesmyslná.** Při pěti živých jsou dva kandidáti skoro celý stůl (otevřená otázka v `obrazovky.md` §5). Návrh: do šesti živých nominace vypustit a hlasovat rovnou o komkoliv, s možností zdržet se. Nad šest zůstat u dvou kroků, ale s kvórem (K10).

**4. Pětka.** Design sám přiznává, že se nedá vyvážit. S jedním sabotérem věta „Určitě není sabotér: X“ řeší partii za dvě kola. Návrh: při pěti vypnout rodinu `cisty`, v šatně nazvat pětku „tréninková partie“ a nepočítat ji do vyvážení.

**5. Šeptanda jako celek.** Soukromé pravdivé věty se stropem tří pravd jsou nejlepší nápad v projektu. Rizika jsou v jednotlivých rodinách (K9). Navíc stíny větu nedostanou, ačkoli mluví dál, a design principem 5 říká „ztrácí moc, ne přítomnost“. Stín se šeptandou je levná varianta do nastavení.

**6. Předák.** V v1 nemá co dělat: rozhoduje sám a návrhy nevidí. Buď ho dotáhnout (návrhy v pohledu, přehlasování viditelné sabotérům, nástupnictví), nebo ho pro v1 zjednodušit na „ten, kdo v noci mačká“. Teď je to nejméně hotová část jádra a přitom na ní stojí v3.

**7. Dvě směny.** Bez dopolední odměny (K4) jsou jen druhou stopou zdarma pro pracanty. Buď dotáhnout, nebo pro v1 vypnout.

**8. Konec limitem.** Podle komentářů v `rules.ts` na něj dojde v 6 až 54 % partií, což je zdravější než původních 2 až 4 %. Předěl kola to ale ukazuje špatně (U8), a to je jediné místo, kde hráč tlak termínu vidí.

---

## 7. Audit plánu a nápadů

| Položka | Hodnocení | Doporučení |
|---|---|---|
| **v1.1 Mistr vybírá partu** | Nejlepší poměr diskuze k práci, jak design říká. Avalon na tom stojí. | První věc po playtestu. Mistr ať se posouvá po sedadlech, aplikace to umí bez nové fáze: výběr party nahradí los v `rozdatPartu`. |
| **v1.2 Domluva sabotérů** | Řeší skutečný problém (dva sabotéři v partě kazí oba), ale přidává obrazovku a fázi. | Levnější varianta: přepínač „konvence“ v nastavení, kde aplikace řekne každému sabotérovi jeho pořadí a pravidlo „když jste v partě dva, kazí nižší číslo“. Nula nových fází. Dilema se tím oslabí, proto jako volba, ne výchozí stav. |
| **v2 Střípkové minihry** | Zajímavé, ale je to nová hra uvnitř hry a průzkum trhu varuje přesně před tím. | Odložit, dokud v1 nemá deset odehraných partií. Jedině „Součet“ stojí za prototyp, protože vyrábí konkrétní lež. |
| **v2 Banka a upgrady** | Ekonomika v sociální dedukci ředí hádku o role hádkou o peníze. Upgrade „Kontrola“ dává přesnou informaci, což jde proti principu 2. | Nestavět. Případně jen jako samostatný režim. |
| **v3 Tajný sabotér** | Chytré, ale stojí na předákovi, který teď nefunguje (K3, K11). | Až po dotažení předáka. |
| **v3 Variabilní parametry** | Levné, zvyšuje znovuhratelnost, nic neskrývá uvnitř partie. | Dobrý kandidát do v1.1 jako přepínač. |
| **v3 Stín na šichtě** | Bere jistotu z jediné tvrdé informace ve hře. Hra pak stojí jen na čtení lidí, což je přesně slabina Vlkodlaků, kterou chce Šichta opravit. | Nestavět. |
| **v3 Dvojitá vražda** | Zrychluje úbytek, proti kterému design bojoval nabídkou odměn. | Nestavět. |
| **Řízená rozprava 13+** | Správně odložené. | Beze změny. |
| **Verze pro velký displej** (plán „po playtestu“) | Tohle je řešení problému „telefony dolů“, ne kosmetika. Sdílená obrazovka na stole ukazuje odpočet, partu, historii a odhalení hlasů, telefony slouží jen na tajné volby, zvuk hraje ze zařízení, které se nezamkne. | Posunout před playtest, aspoň jako jednoduchý „pohled stolu“ (stejný pohled jako hráč, jen bez `ja`). |
| **Supabase větev** | Udržovat dvě pravdy je přesně to, co `navod-cloudflare.md` odmítá. | Smazat nebo přesunout do samostatné větve gitu a z `design.md` §7 vyhodit. |
| **Fáze 3 plánu** | „Playtest, doladit čísla, GH Pages“. GH Pages už není potřeba, appku servíruje worker. | Před playtest zařadit opravy K1 až K7, playtest online s wake lockem, a export protokolu partie (viz níže), jinak se čísla nebudou mít z čeho doladit. |

---

## 8. Vlastní návrhy

Seřazeno podle poměru přínosu k práci.

1. **Posun fáze po odevzdání všech** (server). Zkrátí kolo o třetinu, nic neprozradí, a bere hráčům důvod koukat do telefonu.
2. **`konecFaze` ve stavu a v pohledu** plus wake lock plus pauza jen v akčních fázích. Bez toho online rozprava nepřežije první zamčený iPhone.
3. **Stolní obrazovka.** Jedna URL `?stul=KÓD`, žádné tajemství, velký odpočet, parta, historie, odhalení hlasů, zvuk. Řeší principy 3 a 4, iOS haptiku i zamčený telefon zakladatele.
4. **Historie (H1) v pohledu**: seznam kol s partou, výsledkem, vyhoštěným a jeho rolí, obětí. Zamčená během rozpravy, jak design chce. Bez ní šeptanda o „kole 2“ nedává velkému stolu smysl.
5. **Protokol partie na konci**: JSON a čitelný text (kdo byl na které šichtě, kdo koho volil, kdy padl který sabotér), sdílený tlačítkem. Pro hráče je to zábava, pro tebe jediná data, ze kterých jde doladit `rules.ts`. Žádný server, jen zakladatelův telefon.
6. **Šatna**: unikátní přezdívky (automatická přípona), automatické odebrání odpojených před startem, vyhodit hráče, a „Znovu se stejnou partou“, které místnost vrátí do šatny se stejnými hráči.
7. **Nastavení navíc**: délka rozpravy 3/4/5 min, limit šicht ±1, „tréninková partie“ s delšími časy a nápovědou na obrazovkách. Design má délku rozpravy jako otevřenou otázku, přepínač je nejlevnější způsob, jak ji zodpovědět.
8. **Ceny na konci**: Nejlepší čuch jen pro pracanty, „Nejlepší lhář“ (sabotér s nejméně nominacemi), „Obětní beránek“ (pracant s nejvíc nominacemi). Stojí to pár řádků nad daty, která už jsou v historii.
9. **Šeptanda pro stíny** jako přepínač. Stín mluví dál a věta mu dá o čem.
10. **„Tichá šichta“** jako přepínač: ukázat jen prošla / padla bez počtu. Simulace říká, že na vyvážení je to zdarma, a mění to dilema sabotérů.
11. **Rada bez nominací do šesti živých** (viz §6 bod 3).
12. **Autorizace v reduceru** (viz K6). Přinese to i lepší testy, protože pravidla „kdo smí co“ budou na jednom místě.
13. **Úklid místnosti** alarmem po konci a 404 s hláškou pro připojení do běžící hry.
14. **Klávesnicová alternativa odkrytí role** a pojmenované přepínače v nastavení. Levné, a jednou se to bude hodit na tabletu.
15. **Anglická verze „Shift“** až po usazení v1. Texty jsou už teď na jednom místě v každé obrazovce, i18n vrstva by byla malá.

---

## 9. Otázky, které rozhodnou o dalším postupu

V [ukoly.md](ukoly.md) jsou vedené jako R1 až R5.

1. **Která čísla platí:** `design.md` §3.1, nebo `rules.ts`? Jsou tři různé sady.
2. **Je hot seat plnohodnotný režim, nebo vývojová pomůcka?** Rozhoduje o prioritě K5 a U6.
3. **Dvě směny pro 9 a 12 hráčů:** dotáhnout, nebo pro v1 vypnout?
4. **Repo je veřejné.** Pravidla workspace říkají „repos start private“ a `app-meta.json` říká „open source“. Předpokládám, že to byl záměr, ale zmiňuji to kvůli K6.
5. **Stolní obrazovka před playtestem, nebo po něm?** Ovlivňuje to, co budeš na playtestu vlastně měřit.
