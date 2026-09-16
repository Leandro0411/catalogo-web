import { afterEach, describe, expect, it, vi } from 'vitest';
import { safeGet, safeRemove, safeSet } from './storage';

describe('storage seguro', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('guarda y lee de localStorage cuando está disponible', () => {
    safeSet('k', 'v');
    expect(safeGet('k')).toBe('v');
  });

  it('elimina una clave', () => {
    safeSet('k', 'v');
    safeRemove('k');
    expect(safeGet('k')).toBeNull();
  });

  it('usa un mapa en memoria si localStorage lanza', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    safeSet('k', 'v');
    expect(safeGet('k')).toBe('v');
  });
});
