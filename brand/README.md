# Šichta — brand

**Směr:** C2, „tvrdá poloha". Ocel a rez.
**Tokeny:** [`tokens.css`](tokens.css) je zdroj pravdy. Mockupy nejsou.
**Plátno s návrhy:** https://claude.ai/artifact/RDaLmTWuJK8vqX4SbT2MrV

---

## Pocit

Dílna, kde něco přestává držet. Ocelová šeď, tvrdé rámy, žádné zaoblení.
Rez leze zespoda a nedá se zastavit. Hra se hraje večer, takže obrazovka
nikomu nesvítí do očí a nic na ní nebliká.

Co to **není**: hacking, true crime, retro nostalgie, párty hra s barevnými
bublinami.

## Značka

Tři odpracované čárky a čtvrtá, rezavá, která je přeškrtává. Počítání šicht
i to, že jedna z nich nepatří k ostatním. Čitelné na 24 px.

- Na tmavém: čárky `ocel-100`, přeškrtnutí `rez-400`.
- Na světlém: čárky `ocel-800`, přeškrtnutí `rez-600`.
- Na rezavém: čárky `ocel-800`, přeškrtnutí `ocel-50`.

Tři svislé čárky nikdy nemění barvu.

## Písma

| Role | Písmo | Kde |
|---|---|---|
| Nadpisy | **Anton** | role, jména hráčů, tlačítka, čas, hlavičky |
| Text | **Karla** | instrukce, vysvětlení, popisky |

Anton se píše **jen verzálkami** a nikdy nenese větu delší než tři slova.
Karla nese všechno ostatní. Obě z Google Fonts.

## Pravidla, která se neporušují

**1. Rez je značka, ne role.** Nikdy neoznačuje sabotéra. Používá se na
nadpis obrazovky, časomíru a zvýraznění vlastního jména v soupisce, tedy
na věcech, které vypadají stejně pro každého.

**2. Patina a spál popisují výsledek šichty, nikdy člověka.** Zelená znamená
„šichta prošla", ne „tenhle je hodný". Odhalení role uprostřed hry (vyhoštěný,
zavražděný) je proto na neutrální kostní bílé, ne na barvě.

Jediná výjimka je **závěrečné odhalení na konci hry**, kde barvy role označují.
Hra tam už skončila a není co prozradit.

**3. Obě role vidí tutéž obrazovku.** Tlačítka MAKAT a KAZIT vypadají vždy
identicky, ať hráč může kazit nebo ne. Zašedlé tlačítko by roli prozradilo
z druhé strany stolu. Tohle je herní pravidlo vynucené designem, ne
estetická volba.

**4. Zakrývá se jen obrazovka role.** Tam se nic nemačká, jen čte, takže
„podrž palec" funguje. Na obrazovkách s tlačítky se nezakrývá nic, protože
tam není co skrývat: obě role vidí totéž.

**5. `ocel-400` má na hlavním pozadí kontrast 3,9:1.** Patří na rámy a text
od 24 px výš. Na drobné písmo jde `ocel-300` (4,7:1) a výš.

**6. Žádné zaoblení** kromě lišty „podrž zde". Ocel se neohýbá.

**7. Dotyková plocha nejméně 44 px.** Hlavní tlačítko volby má 86 px,
protože se do něj trefuje pod časovým tlakem.

## Texty

Platí workspace pravidlo: **nikdy em-dash**, nahrazuje se tečkou, dvojtečkou
nebo čárkou. České uvozovky „…". Emoji nikde, tahle hra je nemá.

Tón: krátké věty, oslovení na „ty", žádné vykřičníky. Aplikace je mistr,
co zadá práci a jde pryč. Nefandí, nelituje, nevysvětluje dvakrát.
