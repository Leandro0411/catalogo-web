import { ApiError } from '../../lib/errors';
import { newId } from '../../lib/ids';
import { detectImageType } from '../../../shared/domain/image-type';
import { MAX_IMAGE_BYTES } from '../../../shared/constants';
import { countProductsByImageKey } from '../../repositories/products.repo';
import type { ImageStore } from './image-store';

async function validateVariant(data: ArrayBuffer): Promise<string> {
  if (data.byteLength > MAX_IMAGE_BYTES) {
    throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'La imagen supera 1 MB');
  }

  const type = detectImageType(new Uint8Array(data));

  if (type !== 'image/jpeg' && type !== 'image/webp') {
    throw new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Formato no soportado (usá JPG o WebP)');
  }

  return type;
}

export async function saveProductImage(
  store: ImageStore,
  tenantId: string,
  thumb: ArrayBuffer,
  full: ArrayBuffer,
): Promise<string> {
  const [thumbType, fullType] = await Promise.all([validateVariant(thumb), validateVariant(full)]);

  const base = `t/${tenantId}/${newId()}`;

  await Promise.all([
    store.put(`${base}-480`, thumb, thumbType),
    store.put(`${base}-1200`, full, fullType),
  ]);

  return base;
}

export async function deleteProductImageIfUnreferenced(
  db: D1Database,
  store: ImageStore,
  tenantId: string,
  imageKey: string,
): Promise<void> {
  const count = await countProductsByImageKey(db, tenantId, imageKey);

  if (count > 0) {
    return;
  }

  await Promise.all([store.delete(`${imageKey}-480`), store.delete(`${imageKey}-1200`)]);
}
