import { afterEach, describe, expect, it, vi } from 'vitest';
import { compressImage, ImageDecodeError } from './image-compress';

function fakeBitmap(width: number, height: number): ImageBitmap {
  return { width, height, close: vi.fn() } as unknown as ImageBitmap;
}

function mockCanvas(handler: (type: string, quality: number | undefined) => Blob): void {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D);

  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
    this: HTMLCanvasElement,
    callback: BlobCallback,
    type?: string,
    quality?: number,
  ) {
    callback(handler(type ?? '', quality));
  });
}

describe('compressImage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('genera thumb y full en WebP cuando el navegador lo soporta', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => fakeBitmap(2000, 1000)),
    );
    mockCanvas((type) => new Blob(['x'], { type }));

    const result = await compressImage(new Blob());

    expect(result.thumb.type).toBe('image/webp');
    expect(result.full.type).toBe('image/webp');
  });

  it('recodifica a JPEG si el navegador no puede generar WebP (Safari)', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => fakeBitmap(2000, 1000)),
    );
    mockCanvas((type) =>
      type === 'image/webp' ? new Blob(['x'], { type: 'image/png' }) : new Blob(['x'], { type }),
    );

    const result = await compressImage(new Blob());

    expect(result.thumb.type).toBe('image/jpeg');
    expect(result.full.type).toBe('image/jpeg');
  });

  it('reintenta con calidad 0.6 si el peso supera MAX_IMAGE_BYTES', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => fakeBitmap(2000, 1000)),
    );
    const oversized = new Blob([new Uint8Array(1_048_577)], { type: 'image/webp' });
    const small = new Blob(['x'], { type: 'image/webp' });
    mockCanvas((_type, quality) => (quality === 0.6 ? small : oversized));

    const result = await compressImage(new Blob());

    expect(result.thumb.size).toBe(small.size);
  });

  it('lanza "La foto es demasiado pesada" si sigue excediendo tras el reintento', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => fakeBitmap(2000, 1000)),
    );
    const oversized = new Blob([new Uint8Array(1_048_577)], { type: 'image/webp' });
    mockCanvas(() => oversized);

    await expect(compressImage(new Blob())).rejects.toThrow('La foto es demasiado pesada');
  });

  it('lanza ImageDecodeError si createImageBitmap falla', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => {
        throw new Error('boom');
      }),
    );

    await expect(compressImage(new Blob())).rejects.toBeInstanceOf(ImageDecodeError);
  });
});
