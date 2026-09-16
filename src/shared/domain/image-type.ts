export type DetectedImageType = 'image/jpeg' | 'image/png' | 'image/webp';

const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const RIFF_MAGIC = [0x52, 0x49, 0x46, 0x46];
const WEBP_MAGIC = [0x57, 0x45, 0x42, 0x50];

function matchesAt(bytes: Uint8Array, offset: number, magic: number[]): boolean {
  if (bytes.length < offset + magic.length) {
    return false;
  }

  return magic.every((byte, index) => bytes[offset + index] === byte);
}

export function detectImageType(bytes: Uint8Array): DetectedImageType | null {
  if (matchesAt(bytes, 0, JPEG_MAGIC)) {
    return 'image/jpeg';
  }

  if (matchesAt(bytes, 0, PNG_MAGIC)) {
    return 'image/png';
  }

  if (matchesAt(bytes, 0, RIFF_MAGIC) && matchesAt(bytes, 8, WEBP_MAGIC)) {
    return 'image/webp';
  }

  return null;
}
