import { fetchJson } from './http';
import type { AdminMeResponse } from '../../shared/types/api.types';

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
