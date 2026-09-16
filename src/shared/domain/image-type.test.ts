import { describe, expect, it } from 'vitest';
import { detectImageType } from './image-type';

describe('detectImageType', () => {
  it('detecta JPEG por sus magic bytes', () => {
    expect(detectImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
  });

  it('detecta PNG por sus magic bytes', () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    expect(detectImageType(png)).toBe('image/png');
  });

  it('detecta WebP por RIFF....WEBP', () => {
    const webp = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ]);
    expect(detectImageType(webp)).toBe('image/webp');
  });

  it('devuelve null para un SVG en texto', () => {
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    expect(detectImageType(svg)).toBeNull();
  });

  it('devuelve null para un buffer de 3 bytes que no matchea ninguna firma', () => {
    expect(detectImageType(new Uint8Array([0x00, 0x01, 0x02]))).toBeNull();
  });

  it('devuelve null para un RIFF que no es WEBP', () => {
    const riffAvi = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x41, 0x56, 0x49, 0x20,
    ]);
    expect(detectImageType(riffAvi)).toBeNull();
  });
});
