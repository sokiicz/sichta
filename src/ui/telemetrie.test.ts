import { describe, expect, it } from 'vitest';
import { jeRageKlik, stitekNapisu } from './telemetrie';

/**
 * Rage klik je tři a víc ťuknutí do stejného místa během chvilky. Ne dvě:
 * dvojklik je normální. Ne do jiného místa: rychlé procházení seznamem
 * není vztek.
 */
describe('štítek nápisu', () => {
  it('usekne jméno za dvojtečkou', () => {
    expect(stitekNapisu('NOMINOVAT: HONZA')).toBe('NOMINOVAT');
    expect(stitekNapisu('ODEVZDAT HLAS: KLÁRA')).toBe('ODEVZDAT HLAS');
  });

  it('nápis bez jména nechá', () => {
    expect(stitekNapisu('DO ŠATNY')).toBe('DO ŠATNY');
  });

  it('bez textu nic', () => {
    expect(stitekNapisu(undefined)).toBeUndefined();
    expect(stitekNapisu('')).toBeUndefined();
  });
});

describe('rage klik', () => {
  it('třetí ťuknutí do stejného místa během chvilky sérii dovrší', () => {
    const k = [{ cas: 0, x: 100, y: 100 }, { cas: 400, x: 105, y: 98 }];
    expect(jeRageKlik(k, { cas: 900, x: 102, y: 103 })).toBe(true);
  });

  it('dvě ťuknutí nestačí', () => {
    expect(jeRageKlik([{ cas: 0, x: 100, y: 100 }], { cas: 300, x: 100, y: 100 })).toBe(false);
  });

  it('ťuknutí jinam sérii nepočítá', () => {
    const k = [{ cas: 0, x: 100, y: 100 }, { cas: 400, x: 300, y: 100 }];
    expect(jeRageKlik(k, { cas: 800, x: 100, y: 100 })).toBe(false);
  });

  it('stará ťuknutí se nepočítají', () => {
    const k = [{ cas: 0, x: 100, y: 100 }, { cas: 100, x: 100, y: 100 }];
    expect(jeRageKlik(k, { cas: 5000, x: 100, y: 100 })).toBe(false);
  });
});
