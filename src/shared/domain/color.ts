const LUMINANCE_THRESHOLD = 0.179;
const SRGB_LINEAR_THRESHOLD = 0.03928;
const SRGB_LINEAR_DIVISOR = 12.92;
const SRGB_GAMMA_OFFSET = 0.055;
const SRGB_GAMMA_DIVISOR = 1.055;
const SRGB_GAMMA_EXPONENT = 2.4;
const LUMINANCE_WEIGHTS = { r: 0.2126, g: 0.7152, b: 0.0722 } as const;

function linearizeChannel(channel: number): number {
  return channel <= SRGB_LINEAR_THRESHOLD
    ? channel / SRGB_LINEAR_DIVISOR
    : ((channel + SRGB_GAMMA_OFFSET) / SRGB_GAMMA_DIVISOR) ** SRGB_GAMMA_EXPONENT;
}

function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  return (
    LUMINANCE_WEIGHTS.r * linearizeChannel(r) +
    LUMINANCE_WEIGHTS.g * linearizeChannel(g) +
    LUMINANCE_WEIGHTS.b * linearizeChannel(b)
  );
}

export function contrastText(hex: string): '#000000' | '#FFFFFF' {
  return relativeLuminance(hex) > LUMINANCE_THRESHOLD ? '#000000' : '#FFFFFF';
}
