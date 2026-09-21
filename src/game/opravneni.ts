import type { Akce, HracId, Stav } from './types';

/**
 * Kdo smí kterou akci poslat. Jediné místo, kde se to rozhoduje.
 *
 * Reducer je schválně důvěřivý: vezme každou akci, která dává ve stavu smysl.
 * Kdo ji smí poslat, se řeší tady, protože to závisí na tom, odkud přišla:
 * po síti ji posílá konkrétní telefon s tokenem, na jednom telefonu ji
 * posílá aplikace sama za toho, kdo ho drží.
 *
 * Worker tuhle funkci volá s id hráče podle tokenu. Co neprojde, se zahodí
 * bez odpovědi, stejně jako pokažená zpráva.
 */
export function smiPoslat(s: Stav, a: Akce, od: HracId): boolean {
  const hrac = s.hraci.find((h) => h.id === od);
  if (!hrac) return false;

  switch (a.typ) {
    // Fáze posouvá server, spojení hlídá server, hráče přidává server.
    case 'DALSI_FAZE':
    case 'ODPOJIL_SE':
    case 'PRIPOJIL_SE':
    case 'PRIDAT_HRACE':
      return false;

    // Jen zakladatel rozhoduje o místnosti.
    case 'ZACIT':
    case 'ZMENIT_NASTAVENI':
    case 'ZNOVU':
    case 'HRAT_BEZ_NEJ':
    case 'UKONCIT':
      return hrac.zakladatel;

    // Odejít smí každý sám, vyhodit smí jen zakladatel.
    case 'ODEBRAT_HRACE':
      return a.id === od || hrac.zakladatel;

    // Noc patří předákovi.
    case 'VYBRAT_ODMENU':
    case 'PREDAK_ROZHODL':
      return s.predak === od;

    // Všechno ostatní jde jen sám za sebe.
    default:
      return a.id === od;
  }
}
