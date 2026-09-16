import { fetchJson } from './http';
import type {
  AdminCategory,
  AdminMeResponse,
  AdminProduct,
  ProductInput,
} from '../../shared/types/api.types';
import type { ProductStatus } from '../../shared/types/catalog.types';

export function login(username: string, password: string): Promise<void> {
  return fetchJson<void>('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
}

export function logout(): Promise<void> {
  return fetchJson<void>('/api/admin/logout', { method: 'POST' });
}

export function getMe(): Promise<AdminMeResponse> {
  return fetchJson<AdminMeResponse>('/api/admin/me');
}

export function listCategories(): Promise<AdminCategory[]> {
  return fetchJson<AdminCategory[]>('/api/admin/categories');
}

export function listProducts(): Promise<AdminProduct[]> {
  return fetchJson<AdminProduct[]>('/api/admin/products');
}

export function getProduct(id: string): Promise<AdminProduct> {
  return fetchJson<AdminProduct>(`/api/admin/products/${id}`);
}

export function createProduct(input: ProductInput): Promise<AdminProduct> {
  return fetchJson<AdminProduct>('/api/admin/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function updateProduct(id: string, input: ProductInput): Promise<AdminProduct> {
  return fetchJson<AdminProduct>(`/api/admin/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function setProductStatus(id: string, status: ProductStatus): Promise<AdminProduct> {
  return fetchJson<AdminProduct>(`/api/admin/products/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

export function deleteProduct(id: string): Promise<void> {
  return fetchJson<void>(`/api/admin/products/${id}`, { method: 'DELETE' });
}

export function uploadProductImage(thumb: Blob, full: Blob): Promise<{ imageKey: string }> {
  const form = new FormData();
  form.append('thumb', thumb, 'thumb');
  form.append('full', full, 'full');

  return fetchJson<{ imageKey: string }>('/api/admin/images', { method: 'POST', body: form });
}
