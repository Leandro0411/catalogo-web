import { IMAGE_SIZES, MAX_IMAGE_BYTES } from '../../../../shared/constants';

const WEBP_QUALITY = 0.8;
const JPEG_FALLBACK_QUALITY = 0.82;
const RETRY_QUALITY = 0.6;

export class ImageDecodeError extends Error {}

export interface CompressedImage {
  thumb: Blob;
  full: Blob;
}

type AnyCanvas = OffscreenCanvas | HTMLCanvasElement;
type AnyContext = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

function createCanvas(width: number, height: number): AnyCanvas {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function canvasToBlob(canvas: AnyCanvas, type: string, quality: number): Promise<Blob> {
  if ('convertToBlob' in canvas) {
    return canvas.convertToBlob({ type, quality });
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('No se pudo generar la imagen'));
        }
      },
      type,
      quality,
    );
  });
}

async function encodeVariant(bitmap: ImageBitmap, maxSide: number): Promise<Blob> {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d') as AnyContext | null;

  if (!ctx) {
    throw new Error('No se pudo generar la imagen');
  }

  ctx.drawImage(bitmap, 0, 0, width, height);

  let blob = await canvasToBlob(canvas, 'image/webp', WEBP_QUALITY);
  let format = 'image/webp';

  if (blob.type !== 'image/webp') {
    format = 'image/jpeg';
    blob = await canvasToBlob(canvas, format, JPEG_FALLBACK_QUALITY);
  }

  if (blob.size > MAX_IMAGE_BYTES) {
    blob = await canvasToBlob(canvas, format, RETRY_QUALITY);
  }

  if (blob.size > MAX_IMAGE_BYTES) {
    throw new Error('La foto es demasiado pesada');
  }

  return blob;
}

export async function compressImage(file: File | Blob): Promise<CompressedImage> {
  let bitmap: ImageBitmap;

  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new ImageDecodeError('No pudimos leer la foto. Probá con otra (JPG o PNG)');
  }

  try {
    const thumb = await encodeVariant(bitmap, IMAGE_SIZES.thumb);
    const full = await encodeVariant(bitmap, IMAGE_SIZES.full);
    return { thumb, full };
  } finally {
    bitmap.close();
  }
}
