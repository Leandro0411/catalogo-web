const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
const DEFAULT_PASSWORD_LENGTH = 20;

export function generatePassword(length = DEFAULT_PASSWORD_LENGTH): string {
  const randomValues = crypto.getRandomValues(new Uint32Array(length));
  let password = '';

  for (let i = 0; i < length; i += 1) {
    password += PASSWORD_ALPHABET[randomValues[i] % PASSWORD_ALPHABET.length];
  }

  return password;
}
