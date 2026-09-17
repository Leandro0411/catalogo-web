import { describe, expect, it } from 'vitest';
import { escapeHtml } from './html';

describe('escapeHtml', () => {
  it('escapa & < > " \'', () => {
    expect(escapeHtml(`& < > " '`)).toBe('&amp; &lt; &gt; &quot; &#39;');
  });

  it('no inyecta etiquetas de un nombre de tenant malicioso', () => {
    expect(escapeHtml('<script>x</script>')).toBe('&lt;script&gt;x&lt;/script&gt;');
  });

  it('deja intacto un texto sin caracteres especiales', () => {
    expect(escapeHtml('BANNED')).toBe('BANNED');
  });
});
