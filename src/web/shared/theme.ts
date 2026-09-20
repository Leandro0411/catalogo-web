import type { CSSProperties } from 'react';
import { contrastText } from '../../shared/domain/color';

export function brandStyle(primaryColor: string): CSSProperties {
  return {
    '--brand': primaryColor,
    '--brand-contrast': contrastText(primaryColor),
  } as CSSProperties;
}

/** Pinta la barra del navegador del teléfono con el color del tenant. */
export function setThemeColor(color: string): void {
  const existing = document.querySelector('meta[name="theme-color"]');
  const meta = existing ?? document.createElement('meta');

  if (!existing) {
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }

  meta.setAttribute('content', color);
}
