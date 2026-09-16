export interface ImageGetResult {
  body: ReadableStream;
  contentType: string;
}

export interface ImageStore {
  put(key: string, data: ArrayBuffer, contentType: string): Promise<void>;
  get(key: string): Promise<ImageGetResult | null>;
  delete(key: string): Promise<void>;
}
