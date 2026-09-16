import { describe, expect, it } from 'vitest';
import { generatePassword } from './password-gen';

const ALPHABET_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789]+$/;

describe('generatePassword', () => {
  it('genera una contraseña de la longitud pedida', () => {
    expect(generatePassword(32)).toHaveLength(32);
  });

  it('usa el largo por defecto de 20', () => {
    expect(generatePassword()).toHaveLength(20);
  });

  it('solo usa caracteres del alfabeto sin ambigüedades', () => {
    expect(generatePassword(200)).toMatch(ALPHABET_PATTERN);
  });

  it('genera contraseñas distintas en llamadas sucesivas', () => {
    expect(generatePassword()).not.toBe(generatePassword());
  });
});
