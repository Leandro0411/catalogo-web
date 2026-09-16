import { afterEach, describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';
import { deleteProductImageIfUnreferenced, saveProductImage } from './images.service';
import {
  insertCategory,
  insertProduct,
  insertTenant,
  resetCatalogTables,
} from '../../test/factories';
import type { ImageGetResult, ImageStore } from './image-store';

const VALID_WEBP = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]).buffer;

class FakeImageStore implements ImageStore {
  readonly puts = new Map<string, { data: ArrayBuffer; contentType: string }>();
  readonly deletedKeys: string[] = [];

  async put(key: string, data: ArrayBuffer, contentType: string): Promise<void> {
    this.puts.set(key, { data, contentType });
  }

  async get(key: string): Promise<ImageGetResult | null> {
    const entry = this.puts.get(key);
    return entry ? { body: new ReadableStream(), contentType: entry.contentType } : null;
  }

  async delete(key: string): Promise<void> {
    this.puts.delete(key);
    this.deletedKeys.push(key);
  }
}

describe('saveProductImage', () => {
  it('guarda las variantes 480 y 1200 bajo una base t/<tenantId>/<uuid>', async () => {
    const store = new FakeImageStore();
    const tenantId = '11111111-1111-4111-8111-111111111111';

    const base = await saveProductImage(store, tenantId, VALID_WEBP, VALID_WEBP);

    expect(base).toMatch(new RegExp(`^t/${tenantId}/[0-9a-f-]{36}$`));
    expect(store.puts.get(`${base}-480`)?.contentType).toBe('image/webp');
    expect(store.puts.get(`${base}-1200`)?.contentType).toBe('image/webp');
  });

  it('rechaza una variante que no es JPEG ni WebP', async () => {
    const store = new FakeImageStore();
    const svg = new Uint8Array(new TextEncoder().encode('<svg></svg>'));

    await expect(saveProductImage(store, 't1', VALID_WEBP, svg.buffer)).rejects.toMatchObject({
      status: 415,
      code: 'UNSUPPORTED_MEDIA_TYPE',
    });
  });

  it('rechaza una variante de más de 1 MB', async () => {
    const store = new FakeImageStore();
    const big: Uint8Array<ArrayBuffer> = new Uint8Array(1_048_577);
    big.set([0x52, 0x49, 0x46, 0x46], 0);
    big.set([0x57, 0x45, 0x42, 0x50], 8);

    await expect(saveProductImage(store, 't1', VALID_WEBP, big.buffer)).rejects.toMatchObject({
      status: 413,
      code: 'PAYLOAD_TOO_LARGE',
    });
  });
});

describe('deleteProductImageIfUnreferenced', () => {
  afterEach(async () => {
    await resetCatalogTables(env.DB);
  });

  it('borra ambas variantes cuando ningún producto las usa', async () => {
    const tenant = await insertTenant(env.DB);
    const store = new FakeImageStore();
    const imageKey = `t/${tenant.id}/foto1`;
    await store.put(`${imageKey}-480`, VALID_WEBP, 'image/webp');
    await store.put(`${imageKey}-1200`, VALID_WEBP, 'image/webp');

    await deleteProductImageIfUnreferenced(env.DB, store, tenant.id, imageKey);

    expect(store.deletedKeys).toEqual(
      expect.arrayContaining([`${imageKey}-480`, `${imageKey}-1200`]),
    );
  });

  it('no borra nada cuando otro producto del tenant comparte la clave', async () => {
    const tenant = await insertTenant(env.DB);
    const category = await insertCategory(env.DB, tenant.id);
    const imageKey = `t/${tenant.id}/foto-compartida`;
    await insertProduct(env.DB, tenant.id, category.id, { image_key: imageKey });

    const store = new FakeImageStore();
    await store.put(`${imageKey}-480`, VALID_WEBP, 'image/webp');
    await store.put(`${imageKey}-1200`, VALID_WEBP, 'image/webp');

    await deleteProductImageIfUnreferenced(env.DB, store, tenant.id, imageKey);

    expect(store.deletedKeys).toEqual([]);
  });
});
