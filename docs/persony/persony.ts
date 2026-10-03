/**
 * Šichta: dvacet person a scénáře stolů.
 *
 * Každá persona je sada povahových rysů 0 až 1. Rysy nejsou tipy na výsledek,
 * jsou to vstupy do modelu rozhodování v `hra.ts`. Hodnoty jsou odhad
 * chování typických lidí u stolu, ne měření. Jak moc na nich výsledek visí,
 * ukazuje citlivostní analýza v `spust.ts`.
 */

export interface Rysy {
  /** Kolik z důkazů z šichet a rad umí využít (0 = skoro nic, 1 = přesná dedukce). */
  analytika: number;
  /** S jakou pravděpodobností si zapamatuje a zpracuje každou jednotlivou stopu. */
  pamet: number;
  /** Šum intuice. Míra, o kterou se jeho tipy odchylují od toho, co by z důkazů plynulo. */
  sum: number;
  /** Jak často mluví a obviňuje. */
  mluvnost: number;
  /** Jak moc na ostatní zabírá, co říká. */
  presvedcivost: number;
  /** Jak moc se nechá ovlivnit tím, co říkají ostatní. */
  sugestibilita: number;
  /** Jak ochotně nahlas řekne svou šeptandu. */
  sdilnost: number;
  /** Čtení lidí: schopnost poznat, že někdo lže. */
  detekce: number;
  /** Jak dobře lže, když je sabotér. */
  lhani: number;
  /** Odvaha rozhodovat: nominovat na vlastní riziko, kazit, nezdržet se. */
  odvaha: number;
  /** Pomstychtivost vůči těm, kdo hlasovali proti němu. */
  mstivost: number;
  /** Sklon zdržet se, když si není jistý. */
  zdrzenlivost: number;
  /** Pravděpodobnost, že stihne udělat tah, který se po něm chce. */
  pozornost: number;
  /** Rychlost reakce, 1 = průměr, víc = pomalejší. */
  tempo: number;
  /** Sklon dělat věci pro legraci a naostro náhodně. */
  trollovani: number;
  /** Jako sabotér: umí se s partnerem sladit bez slov (dohodnutá konvence, společný cíl). */
  koordinace: number;
  /** Jako sabotér: obětuje partnera, když tím získá důvěru stolu. */
  obetovani: number;
  /** Netrpělivost: tlačí na zkrácení rozpravy a vyplácí hlas stínu brzy. */
  netrpelivost: number;
  /** Zná pravidla do hloubky (strop tří pravd, poslední kolo, jen pracanti umírají). */
  pravidla: number;
  /** Jak moc věří kamarádům a partnerům u stolu. */
  loajalita: number;
}

export interface Persona {
  klic: string;
  jmeno: string;
  vek: number;
  prezdivka: string;
  /** Jedna věta: kdo to je a jak se u stolu chová. */
  portret: string;
  rysy: Rysy;
}

const P = (
  klic: string, jmeno: string, vek: number, prezdivka: string, portret: string, rysy: Rysy,
): Persona => ({ klic, jmeno, vek, prezdivka, portret, rysy });

export const PERSONY: Persona[] = [
  P('tomas', 'Tomáš', 34, 'Excel',
    'Programátor. Píše si poznámky, pamatuje každou partu a každý hlas. Počítá, ale lhát neumí a mluví dlouho.',
    { analytika: .95, pamet: .95, sum: .25, mluvnost: .6, presvedcivost: .4, sugestibilita: .15, sdilnost: .95, detekce: .35,
      lhani: .25, odvaha: .35, mstivost: .1, zdrzenlivost: .35, pozornost: .95, tempo: 1.3, trollovani: 0,
      koordinace: .6, obetovani: .5, netrpelivost: .1, pravidla: .95, loajalita: .2 }),
  P('jana', 'Jana', 29, 'Megafon',
    'Extrovertka, která vyplní každé ticho. Obviňuje rychle a nahlas, často mimo. Co řekne hlasitě, se prosadí.',
    { analytika: .4, pamet: .55, sum: 1.1, mluvnost: .95, presvedcivost: .8, sugestibilita: .4, sdilnost: .9, detekce: .45,
      lhani: .55, odvaha: .75, mstivost: .5, zdrzenlivost: .05, pozornost: .85, tempo: .8, trollovani: .05,
      koordinace: .3, obetovani: .15, netrpelivost: .5, pravidla: .35, loajalita: .5 }),
  P('petr', 'Petr', 41, 'Mlčenlivý',
    'Introvert s pokerovou tváří. Skoro nemluví, málokdy nominuje. Když se rozhodne, má většinou pravdu.',
    { analytika: .6, pamet: .75, sum: .6, mluvnost: .1, presvedcivost: .3, sugestibilita: .5, sdilnost: .4, detekce: .55,
      lhani: .6, odvaha: .3, mstivost: .1, zdrzenlivost: .6, pozornost: .9, tempo: 1, trollovani: 0,
      koordinace: .5, obetovani: .3, netrpelivost: .1, pravidla: .6, loajalita: .3 }),
  P('marek', 'Marek', 31, 'Veterán',
    'Léta hraje Mafii a Werewolfa. Čte stůl i statistiku, lže bez mrknutí a se spoluhráčem se domluví beze slov.',
    { analytika: .85, pamet: .85, sum: .35, mluvnost: .7, presvedcivost: .7, sugestibilita: .15, sdilnost: .8, detekce: .85,
      lhani: .9, odvaha: .65, mstivost: .25, zdrzenlivost: .25, pozornost: .95, tempo: .8, trollovani: 0,
      koordinace: .9, obetovani: .8, netrpelivost: .3, pravidla: 1, loajalita: .1 }),
  P('lenka', 'Lenka', 25, 'Nováček',
    'Hraje poprvé a pravidla chápe napůl. Hlasuje podle pocitu, nechá se přesvědčit prvním, kdo se ozve.',
    { analytika: .3, pamet: .5, sum: 1.2, mluvnost: .4, presvedcivost: .3, sugestibilita: .7, sdilnost: .8, detekce: .2,
      lhani: .15, odvaha: .35, mstivost: .1, zdrzenlivost: .5, pozornost: .8, tempo: 1.5, trollovani: .05,
      koordinace: .1, obetovani: 0, netrpelivost: .2, pravidla: .1, loajalita: .5 }),
  P('kuba', 'Kuba', 22, 'Šašek',
    'Hraje pro srandu. Nominuje kamarády, aby se smáli, a občas si vymyslí šeptandu. Bere to jako večírek.',
    { analytika: .4, pamet: .45, sum: 1.5, mluvnost: .8, presvedcivost: .5, sugestibilita: .3, sdilnost: .7, detekce: .3,
      lhani: .5, odvaha: .8, mstivost: .3, zdrzenlivost: .1, pozornost: .7, tempo: .7, trollovani: .35,
      koordinace: .2, obetovani: .5, netrpelivost: .6, pravidla: .4, loajalita: .4 }),
  P('radek', 'Radek', 37, 'Mstitel',
    'Nezapomíná. Kdo proti němu hlasoval, ten je jeho cíl, ať už je pravda jakákoli. Jinak solidní hráč.',
    { analytika: .55, pamet: .7, sum: .8, mluvnost: .6, presvedcivost: .55, sugestibilita: .2, sdilnost: .75, detekce: .4,
      lhani: .5, odvaha: .8, mstivost: .95, zdrzenlivost: .1, pozornost: .9, tempo: .9, trollovani: 0,
      koordinace: .4, obetovani: .1, netrpelivost: .4, pravidla: .6, loajalita: .5 }),
  P('hanka', 'Hanka', 38, 'Ovečka',
    'Nechce být ta, kdo rozhodne. Počká, kam se přikloní většina, a tam půjde. Slabá vůle, dobré srdce.',
    { analytika: .45, pamet: .6, sum: .7, mluvnost: .25, presvedcivost: .15, sugestibilita: .95, sdilnost: .8, detekce: .3,
      lhani: .3, odvaha: .2, mstivost: .05, zdrzenlivost: .45, pozornost: .9, tempo: 1.1, trollovani: 0,
      koordinace: .3, obetovani: .1, netrpelivost: .3, pravidla: .3, loajalita: .4 }),
  P('ondra', 'Ondra', 33, 'Paranoik',
    'Nevěří nikomu. Nominuje každé kolo, mění cíle a vidí spiknutí i v tom, že někdo zakašlal.',
    { analytika: .5, pamet: .8, sum: 1, mluvnost: .6, presvedcivost: .45, sugestibilita: .1, sdilnost: .5, detekce: .6,
      lhani: .4, odvaha: .85, mstivost: .6, zdrzenlivost: .05, pozornost: .95, tempo: 1, trollovani: 0,
      koordinace: .3, obetovani: .2, netrpelivost: .3, pravidla: .6, loajalita: .05 }),
  P('eliska', 'Eliška', 27, 'Důvěřivka',
    'Věří každému, kdo se tváří upřímně. Nechce nikomu ublížit, tak se při hlasování raději zdrží.',
    { analytika: .4, pamet: .6, sum: .8, mluvnost: .35, presvedcivost: .3, sugestibilita: .6, sdilnost: .9, detekce: .15,
      lhani: .25, odvaha: .15, mstivost: 0, zdrzenlivost: .7, pozornost: .9, tempo: 1.2, trollovani: 0,
      koordinace: .3, obetovani: 0, netrpelivost: .2, pravidla: .3, loajalita: .8 }),
  P('martin', 'Martin', 45, 'Diplomat',
    'Hledá kompromis a umí stůl uklidnit. Rozumný, málokdy extrémní, a když mluví, ostatní poslouchají.',
    { analytika: .65, pamet: .75, sum: .5, mluvnost: .65, presvedcivost: .65, sugestibilita: .4, sdilnost: .8, detekce: .55,
      lhani: .55, odvaha: .35, mstivost: .05, zdrzenlivost: .4, pozornost: .95, tempo: 1, trollovani: 0,
      koordinace: .6, obetovani: .4, netrpelivost: .3, pravidla: .6, loajalita: .4 }),
  P('pavel', 'Pavel', 35, 'Lhář',
    'Charismatický a sebejistý. Jako sabotér je noční můra, jako pracant působí podezřele, protože se pořád usmívá.',
    { analytika: .6, pamet: .7, sum: .6, mluvnost: .85, presvedcivost: .85, sugestibilita: .2, sdilnost: .7, detekce: .6,
      lhani: .95, odvaha: .7, mstivost: .3, zdrzenlivost: .2, pozornost: .9, tempo: .9, trollovani: .05,
      koordinace: .8, obetovani: .6, netrpelivost: .3, pravidla: .7, loajalita: .2 }),
  P('dana', 'Dana', 33, 'Červenající',
    'Poctivá do morku kostí. Neumí lhát, červená se, zadrhává. Jako pracant skvělá, jako sabotér průhledná.',
    { analytika: .6, pamet: .75, sum: .6, mluvnost: .45, presvedcivost: .35, sugestibilita: .5, sdilnost: .9, detekce: .6,
      lhani: .05, odvaha: .3, mstivost: .1, zdrzenlivost: .5, pozornost: .95, tempo: 1.1, trollovani: 0,
      koordinace: .4, obetovani: .1, netrpelivost: .2, pravidla: .5, loajalita: .6 }),
  P('filip', 'Filip', 28, 'Soutěživec',
    'Chce vyhrát za každou cenu. Riskuje, tlačí na hlasování a jako sabotér kazí tvrdě a často.',
    { analytika: .75, pamet: .8, sum: .5, mluvnost: .7, presvedcivost: .6, sugestibilita: .2, sdilnost: .7, detekce: .6,
      lhani: .7, odvaha: .9, mstivost: .5, zdrzenlivost: .1, pozornost: .95, tempo: .8, trollovani: 0,
      koordinace: .7, obetovani: .7, netrpelivost: .5, pravidla: .8, loajalita: .1 }),
  P('tereza', 'Tereza', 19, 'Do mobilu',
    'Půlka pozornosti je pořád na jiné obrazovce. Tahy stíhá na poslední chvíli, někdy vůbec, a rozpravu nesleduje.',
    { analytika: .35, pamet: .35, sum: 1.3, mluvnost: .3, presvedcivost: .2, sugestibilita: .6, sdilnost: .5, detekce: .2,
      lhani: .3, odvaha: .3, mstivost: .1, zdrzenlivost: .5, pozornost: .55, tempo: 1.8, trollovani: .1,
      koordinace: .1, obetovani: .1, netrpelivost: .7, pravidla: .15, loajalita: .5 }),
  P('vojta', 'Vojta', 14, 'Puberťák',
    'Impulzivní čtrnáctiletý, který chce dělat to, co jeho kamarád. Krátká pozornost, spousta energie, málo trpělivosti.',
    { analytika: .4, pamet: .5, sum: 1.3, mluvnost: .6, presvedcivost: .3, sugestibilita: .6, sdilnost: .6, detekce: .25,
      lhani: .35, odvaha: .8, mstivost: .5, zdrzenlivost: .1, pozornost: .65, tempo: .7, trollovani: .4,
      koordinace: .2, obetovani: .3, netrpelivost: .8, pravidla: .3, loajalita: .7 }),
  P('bozena', 'Božena', 71, 'Babi',
    'Pomalá s telefonem, ale pozorně sleduje lidi. Věří všem a nikomu nechce křivdit. Šeptanda jí trvá minutu.',
    { analytika: .4, pamet: .45, sum: .8, mluvnost: .45, presvedcivost: .5, sugestibilita: .5, sdilnost: .9, detekce: .65,
      lhani: .2, odvaha: .15, mstivost: .1, zdrzenlivost: .6, pozornost: .7, tempo: 2, trollovani: 0,
      koordinace: .15, obetovani: 0, netrpelivost: .05, pravidla: .15, loajalita: .8 }),
  P('zdenek', 'Zdeněk', 52, 'Šéf',
    'Zvyklý velet. Řekne, kdo je sabotér, a čeká, že se podle toho bude hlasovat. Data ho nezajímají, autorita ano.',
    { analytika: .5, pamet: .6, sum: .7, mluvnost: .9, presvedcivost: .9, sugestibilita: .05, sdilnost: .6, detekce: .4,
      lhani: .5, odvaha: .85, mstivost: .6, zdrzenlivost: .05, pozornost: .9, tempo: .8, trollovani: 0,
      koordinace: .3, obetovani: .2, netrpelivost: .6, pravidla: .4, loajalita: .3 }),
  P('sarka', 'Šárka', 36, 'Čtenářka lidí',
    'Psycholožka. Nepočítá, ale vidí, kdo se při větě zasekl. Lidi čte líp než kdokoli u stolu, statistiku vůbec.',
    { analytika: .6, pamet: .8, sum: .45, mluvnost: .5, presvedcivost: .55, sugestibilita: .2, sdilnost: .8, detekce: .9,
      lhani: .7, odvaha: .5, mstivost: .15, zdrzenlivost: .3, pozornost: .95, tempo: 1, trollovani: 0,
      koordinace: .5, obetovani: .4, netrpelivost: .2, pravidla: .65, loajalita: .3 }),
  P('ivo', 'Ivo', 47, 'Ať to skončí',
    'Přišel kvůli kamarádům a chce být doma do deseti. Pořád tlačí, ať se zkrátí rozprava a ať už se hlasuje.',
    { analytika: .45, pamet: .5, sum: .9, mluvnost: .2, presvedcivost: .2, sugestibilita: .5, sdilnost: .4, detekce: .3,
      lhani: .4, odvaha: .25, mstivost: .05, zdrzenlivost: .65, pozornost: .85, tempo: .9, trollovani: .05,
      koordinace: .3, obetovani: .2, netrpelivost: .95, pravidla: .3, loajalita: .3 }),
];

/** Dokonalý hráč pro kalibraci: protějšek bota z `docs/balance-sim.mjs`, žádná společenská hra. */
export const ROBOT: Persona = P('robot', 'Robot', 0, 'Bot',
  'Přesná dedukce bez společenské vrstvy. Slouží jen ke kalibraci proti staršímu simulátoru.',
  { analytika: 1, pamet: 1, sum: 0, mluvnost: 0, presvedcivost: 0, sugestibilita: 0, sdilnost: 1, detekce: 0,
    lhani: .5, odvaha: 1, mstivost: 0, zdrzenlivost: 0, pozornost: 1, tempo: 1, trollovani: 0,
    koordinace: 0, obetovani: 0, netrpelivost: 0, pravidla: 0, loajalita: 0 });

export const PODLE_KLICE = new Map(PERSONY.map((p) => [p.klic, p]));

// ---------------------------------------------------------------- stoly

/** Úprava rysů, kterou stůl přináší (alkohol, první hra). Násobí se, výsledek se ořízne na 0 až 1. */
export type Uprava = Partial<Record<keyof Rysy, number>>;

export interface Scenar {
  klic: string;
  nazev: string;
  popis: string;
  /** Velikosti stolu, které dávají smysl. */
  velikosti: number[];
  /** Váhy person. Chybějící persona = váha 0. Prázdné = všechny stejně. */
  vahy: Record<string, number>;
  /** Kolik dvojic kamarádů nebo partnerů sedí u stolu. */
  pary: number;
  /** Násobky rysů pro celý stůl. */
  uprava?: Uprava;
  /** Kolik partií po sobě se hraje (učení). */
  vecer?: number;
}

export const SCENARE: Scenar[] = [
  { klic: 'mix', nazev: 'Nesourodá parta', popis: 'Náhodní lidé z celého spektra. Základní měřítko.',
    velikosti: [5, 6, 7, 8, 9, 10, 11, 12], vahy: {}, pary: 1 },
  { klic: 'rodina', nazev: 'Rodinná večeře', popis: 'Rodiče, děti, babička. Kdo je kdo se zná, kamarádi se kryjí.',
    velikosti: [5, 6, 7],
    vahy: { bozena: 2, vojta: 2, hanka: 2, zdenek: 2, eliska: 1.5, ivo: 1.5, jana: 1.5, tereza: 1, martin: 1, dana: 1 }, pary: 1 },
  { klic: 'kamaradi', nazev: 'Kamarádi na chatě', popis: 'Kamarádi, dva páry, hlasitější i tišší. Typický domácí playtest.',
    velikosti: [6, 7, 8, 9, 10],
    vahy: { jana: 1.5, kuba: 1.5, radek: 1, ondra: 1, filip: 1, pavel: 1, tereza: 1, lenka: 1, petr: 1, hanka: 1, martin: 1, sarka: 1, ivo: 1 }, pary: 2 },
  { klic: 'deskovkari', nazev: 'Deskoherní klub', popis: 'Lidé, kteří hrají sociální dedukce pravidelně. Nejtěžší stůl pro pracanty.',
    velikosti: [6, 7, 8, 9],
    vahy: { marek: 3, tomas: 2, pavel: 2, sarka: 2, filip: 2, martin: 1, petr: 1, ondra: 1 }, pary: 0,
    uprava: { pravidla: 1.15, pamet: 1.1 } },
  { klic: 'firma', nazev: 'Firemní teambuilding', popis: 'Kolegové, co se tak neznají. Šéf, tichý kolega, ostýchaví a pár hlasitých.',
    velikosti: [8, 9, 10, 11, 12],
    vahy: { zdenek: 1.5, martin: 2, hanka: 2, petr: 2, dana: 2, ivo: 2, tomas: 1, jana: 1, eliska: 1, tereza: 1, lenka: 1, filip: 1 }, pary: 1 },
  { klic: 'mejdan', nazev: 'Večírek po pár pivech', popis: 'Hlučný stůl, polovina lidí nepamatuje, kdo byl na minulé šichtě.',
    velikosti: [7, 8, 9, 10, 11, 12],
    vahy: { kuba: 3, jana: 2, radek: 2, tereza: 2, vojta: 0.5, pavel: 1, ondra: 1, ivo: 1, hanka: 1, filip: 1, zdenek: 1.5, lenka: 1 }, pary: 2,
    uprava: { sum: 1.4, pamet: 0.75, pozornost: 0.88, analytika: 0.85, trollovani: 1.5 } },
  { klic: 'skolaci', nazev: 'Školní parta', popis: 'Teenageři a mladí. Rychle, hlasitě, v klikách, bez trpělivosti.',
    velikosti: [8, 9, 10, 11, 12],
    vahy: { vojta: 4, kuba: 2, tereza: 3, jana: 1.5, lenka: 1, hanka: 1, filip: 1 }, pary: 3 },
  { klic: 'novacci', nazev: 'První hra, nikdo ji nezná', popis: 'Nikdo nikdy nic podobného nehrál. Pravidla se učí za pochodu.',
    velikosti: [5, 6, 7, 8, 9, 10],
    vahy: { lenka: 3, hanka: 2, eliska: 2, bozena: 1, tereza: 1, ivo: 1, petr: 1, kuba: 1, jana: 1 }, pary: 1,
    uprava: { pravidla: 0.5, analytika: 0.85, lhani: 0.8, detekce: 0.8 } },
  { klic: 'analytici', nazev: 'Analytický tým', popis: 'Lidé, kteří počítají a nic nezapomenou. Chybí jim lhaní, ne dedukce.',
    velikosti: [6, 7, 8, 9, 10],
    vahy: { tomas: 3, sarka: 2, marek: 2, petr: 2, martin: 2, filip: 1 }, pary: 0 },
  { klic: 'dominanti', nazev: 'Dominanti a tichošlápci', popis: 'Několik silných osobností a pár těch, kdo se nechají vést.',
    velikosti: [7, 8, 9, 10, 11],
    vahy: { zdenek: 2, jana: 2, pavel: 1, radek: 1.5, filip: 1.5, petr: 2, ivo: 2, hanka: 2, dana: 1, lenka: 1 }, pary: 1 },
  { klic: 'vecer', nazev: 'Večer pěti partií', popis: 'Mix lidí, kteří hrají pět partií po sobě a mezi nimi se učí.',
    velikosti: [6, 8, 10],
    vahy: {}, pary: 1, vecer: 5 },
];
