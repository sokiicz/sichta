# Audit obrazovek, 2026-09-20

Kontrolovaných obrazovek: **34**. Nálezů po opravách: **0**.

Druhé kolo auditu už neběželo jen nad zdrojákem. Postavil jsem
[`render-harness.mjs`](render-harness.mjs), který vytáhne kořen každé obrazovky
do jedné stránky, ta se otevře v prohlížeči a rozměry se **změří**, ne odhadnou.
Právě to našlo chybu, kterou statická kontrola minula.

Strojová část: [`audit-obrazovek.mjs`](audit-obrazovek.mjs), pouští se z adresáře
s `project/`. Kontroluje kostru souboru, rozměr kořene, rozbité odkazy, em-dashe,
rovné uvozovky, dotykové plochy pod 44 px, ikonové prvky bez `aria-label`,
`input` bez `label`, barvy mimo tokeny a zmínku o sabotérovi na sdílené
obrazovce.

---

## Co audit našel

### 1. Ukazatel postupu byl 5px odkaz · 9 obrazovek · VYSOKÁ
Obrazovky, které běží na čas, mají dole tenký ukazatel. V prototypu je to
zároveň odkaz na další krok, takže vznikla pětipixelová klikací plocha.

**Opraveno:** `padding: 20px 0; margin: -20px 0; background-clip: content-box`.
Viditelný pruh zůstal 5 px, dotyková plocha je 45 px, layout se neposunul.

### 2. Ikonový odkaz bez popisku · P02 · VYSOKÁ
Odkaz na čtečku QR začínal ikonou. Doplněn `aria-label`.

### 3. Patina označovala člověka · P21 · VYSOKÁ
Razítko „BYLA SABOTÉR" bylo na zelené patině. To porušuje vlastní pravidlo
značky: *patina a spál popisují výsledek šichty, nikdy člověka.*

**Opraveno:** razítko je neutrální kostní bílá s tmavým textem. Informaci nese
slovo, ne barva. Vedlejší efekt: je to ostřejší.

> Na závěrečném odhalení (P29) barvy roli označují. Je to vědomá výjimka, hra
> už skončila a není co prozradit. Dopsáno do `brand/README.md`.

### 4. Odměna a noc si odporovaly · P23 → P26 · VYSOKÁ
Předák si vzal Tmu, a ráno přesto někdo zemřel.

**Opraveno:** všechny tři odměny jsou dostupné, vybírá se Vražda, a pravidlo
o dvou vraždách po sobě se říká dopředu („příští noc už vražda nepůjde")
místo zašedlého tlačítka. Průchod teď sedí: odměna → volba oběti → ráno.

### 5. „Zdržet se" v radě · P19 · STŘEDNÍ
Nakreslil jsem tlačítko, které v pravidlech není. Propašovat nové pravidlo
skrz mockup je špatně.

**Opraveno:** odstraněno. Jestli se má zdržení přidat, patří to nejdřív do
[design.md](design.md).

### 6. Falešný poplach na přetečení · P02 · NÍZKÁ
Heuristika sečetla dvanáct tlačítek klávesnice, jako by stála nad sebou.
Jsou ve třech sloupcích. Skutečná výška obsahu je 592 px při 844 px.

**Opraveno v auditu**, ne v obrazovce: kontrola přeskakuje soubory s mřížkou.

---

## Druhé kolo: co našlo až vykreslení

### 7. Políčka pro kód přetékala o 72 px · P02 · KRITICKÁ
Šest políček mělo `flex-grow: 1` bez `flex-basis: 0`, takže se nesmrskla pod
velikost obsahu a poslední dvě vytekla mimo obrazovku. Statická kontrola to
minout musela, protože v kódu na tom nic špatně nevypadá.

**Opraveno:** `flex: 1 1 0; min-width: 0`, pevná výška místo `aspect-ratio`,
menší písmo. Ověřeno měřením: 0 px přetečení.

### 8. Dvě obrazovky přerůstaly výšku · P04, P27 · VYSOKÁ
Šatna 859 px, Pravidla 946 px při rámu 844.

Příčina je klasická past sloupcového flexu: položka s `flex-grow: 1` neprestane
růst, dokud nemá `min-height: 0`. Bez toho `overflow` vůbec neplatí a obsah
vytlačí obrazovku.

**Opraveno:** `min-height: 0` doplněno všem rostoucím kontejnerům (27 souborů)
a dlouhé seznamy dostaly `overflow-y: auto`. Vedlejší efekt je důležitý: na
malém telefonu se scrolluje seznam, ne celá obrazovka, takže tlačítko zůstane
dole.

### 9. Falešný poplach na ořezání · P01, P10, P12, P28 · ŽÁDNÁ
Měření hlásilo 60 až 80 px přes rám. Jsou to dekorativní gradienty posazené
záporným offsetem pod `overflow: hidden`. Čísla přesně odpovídají offsetům
(blob na `bottom: -80px` dá 80), takže je to záměr, ne chyba.

---

## Výsledek měření

| Co | Výsledek |
|---|---|
| Obrazovek | 34 |
| Výška přesně 844 px | 34 ze 34 |
| Vodorovné přetečení | 0 |
| Skutečně oříznutý obsah | 0 |

---

## Co audit pořád nekontroluje

Je poctivější to přiznat než předstírat, že nula nálezů znamená hotovo.

- **Neběží to na skutečném telefonu.** Měřeno v desktopovém prohlížeči při
  390×844. Systémová lišta, výřez a adresní řádek ubírají výšku, kterou tady
  nevidím.
- **Kontrast je jen seznam tokenů**, ne spočítaný poměr pro každou dvojici
  popředí a pozadí. Pravidla z `brand/README.md` platí, ale nejsou vynucená.
- **Na 667px displeji (iPhone SE) přeteče obsah u 15 obrazovek.** Není to chyba,
  seznamy se mají scrollovat. Ale znamená to, že hlavní tlačítko musí být
  v reálné aplikaci přilepené dole, ne na konci toku.
- **Tón a srozumitelnost textů** posoudí jedině člověk.

---

## Zbylé otevřené věci

| Co | Kde | Poznámka |
|---|---|---|
| Průchod přeskakuje třetí šichtu | P26 → P28 | Prototyp jde rovnou na konec, aby šel dohrát. V reálu se kolo opakuje. |
| Nominace při malém stole | P17 | Při pěti živých jsou dva kandidáti skoro celý stůl. Viz otevřené otázky v design.md. |
| Přilepené tlačítko dole | všechny | Na 667px displeji musí hlavní akce zůstat viditelná i při scrollu seznamu. Řeší se až v buildu. |
