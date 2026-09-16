import { PBKDF2_ITERATIONS } from '../constants';

const ALGORITHM = 'pbkdf2-sha256';
const SALT_BYTES = 16;
const KEY_BYTES = 32;
const HASH_FORMAT_PARTS = 4;

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

async function derive(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<Uint8Array<ArrayBuffer>> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );

  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    keyMaterial,
    KEY_BYTES * 8,
  );

  return new Uint8Array(derived);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i] ^ b[i];
  }

  return diff === 0;
}

export async function hashPassword(
  password: string,
  iterations = PBKDF2_ITERATIONS,
): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt, iterations);

  return `${ALGORITHM}$${iterations}$${toBase64(salt)}$${toBase64(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');

  if (parts.length !== HASH_FORMAT_PARTS || parts[0] !== ALGORITHM) {
    return false;
  }

  const [, iterationsRaw, saltB64, hashB64] = parts;
  const iterations = Number(iterationsRaw);

  if (!Number.isInteger(iterations) || iterations <= 0) {
    return false;
  }

  let salt: Uint8Array<ArrayBuffer>;
  let expectedHash: Uint8Array<ArrayBuffer>;

  try {
    salt = fromBase64(saltB64 ?? '');
    expectedHash = fromBase64(hashB64 ?? '');
  } catch {
    return false;
  }

  const actualHash = await derive(password, salt, iterations);

  return timingSafeEqual(actualHash, expectedHash);
}
