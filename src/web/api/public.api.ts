import { fetchJson } from './http';
import type { PublicCatalogResponse } from '../../shared/types/api.types';

export function getCatalog(slug: string, signal?: AbortSignal): Promise<PublicCatalogResponse> {
  return fetchJson<PublicCatalogResponse>(`/api/public/tenants/${slug}/catalog`, { signal });
}
