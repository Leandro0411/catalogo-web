// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password';

const TEST_ITERATIONS = 1000;

describe('hashPassword', () => {
  it('genera un hash con el formato pbkdf2-sha256$iter$salt$hash', async () => {
    const hash = await hashPassword('Sup3rSecreta!', TEST_ITERATIONS);
    const parts = hash.split('$');

    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe('pbkdf2-sha256');
    expect(parts[1]).toBe(String(TEST_ITERATIONS));
  });

  it('genera sales distintas en cada llamada, produciendo hashes distintos', async () => {
    const hashA = await hashPassword('Sup3rSecreta!', TEST_ITERATIONS);
    const hashB = await hashPassword('Sup3rSecreta!', TEST_ITERATIONS);

    expect(hashA).not.toBe(hashB);
  });
});

describe('verifyPassword', () => {
  it('acepta la contraseña correcta', async () => {
    const hash = await hashPassword('Sup3rSecreta!', TEST_ITERATIONS);
    expect(await verifyPassword('Sup3rSecreta!', hash)).toBe(true);
  });

  it('rechaza una contraseña incorrecta', async () => {
    const hash = await hashPassword('Sup3rSecreta!', TEST_ITERATIONS);
    expect(await verifyPassword('otra-cosa', hash)).toBe(false);
  });

  it('rechaza un formato inválido sin lanzar', async () => {
    await expect(verifyPassword('cualquiera', 'formato-invalido')).resolves.toBe(false);
    await expect(verifyPassword('cualquiera', '')).resolves.toBe(false);
  });

  it('rechaza un hash alterado', async () => {
    const hash = await hashPassword('Sup3rSecreta!', TEST_ITERATIONS);
    const tampered = `${hash.slice(0, -4)}AAAA`;

    expect(await verifyPassword('Sup3rSecreta!', tampered)).toBe(false);
  });
});
