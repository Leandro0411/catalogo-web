import type { ImageGetResult, ImageStore } from './image-store';

const CACHE_TTL_SECONDS = 2_592_000;

interface ImageMetadata {
  contentType: string;
}

class KvImageStore implements ImageStore {
  constructor(private readonly kv: KVNamespace) {}

  async put(key: string, data: ArrayBuffer, contentType: string): Promise<void> {
    await this.kv.put(key, data, { metadata: { contentType } satisfies ImageMetadata });
  }

  async get(key: string): Promise<ImageGetResult | null> {
    const result = await this.kv.getWithMetadata<ImageMetadata>(key, {
      type: 'stream',
      cacheTtl: CACHE_TTL_SECONDS,
    });

    if (result.value === null) {
      return null;
    }

    return {
      body: result.value,
      contentType: result.metadata?.contentType ?? 'application/octet-stream',
    };
  }

  async delete(key: string): Promise<void> {
    await this.kv.delete(key);
  }
}

export function createImageStore(env: Env): ImageStore {
  return new KvImageStore(env.IMAGES);
}
