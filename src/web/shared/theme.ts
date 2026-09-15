import type { CSSProperties } from 'react';
import { contrastText } from '../../shared/domain/color';

export function brandStyle(primaryColor: string): CSSProperties {
  return {
    '--brand': primaryColor,
    '--brand-contrast': contrastText(primaryColor),
  } as CSSProperties;
}
