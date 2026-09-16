const VOWELS = ['a', 'e', 'i', 'o', 'u'];

export function pluralize(word: string, count: number): string {
  const lower = word.toLowerCase();

  if (count === 1) {
    return lower;
  }

  const lastChar = lower.slice(-1);
  const suffix = VOWELS.includes(lastChar) ? 's' : 'es';
  return `${lower}${suffix}`;
}
