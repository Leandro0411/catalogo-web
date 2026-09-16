import { cartStorageSchema } from '../../../shared/schemas/cart.schema';
import type { CartLine } from '../../../shared/types/cart.types';
import { safeGet, safeSet } from '../../shared/storage';
import { cartKey } from '../../shared/storage-keys';

type Listener = () => void;

const EMPTY_LINES: CartLine[] = [];
const snapshots = new Map<string, CartLine[]>();
const listenersBySlug = new Map<string, Set<Listener>>();

function readFromStorage(slug: string): CartLine[] {
  const raw = safeGet(cartKey(slug));

  if (!raw) {
    return EMPTY_LINES;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    const result = cartStorageSchema.safeParse(parsed);
    return result.success ? result.data.lines : EMPTY_LINES;
  } catch {
    return EMPTY_LINES;
  }
}

function notify(slug: string): void {
  for (const listener of listenersBySlug.get(slug) ?? []) {
    listener();
  }
}

export function getCartSnapshot(slug: string): CartLine[] {
  if (!snapshots.has(slug)) {
    snapshots.set(slug, readFromStorage(slug));
  }
  return snapshots.get(slug) ?? EMPTY_LINES;
}

export function setCartLines(slug: string, lines: CartLine[]): void {
  snapshots.set(slug, lines);
  safeSet(cartKey(slug), JSON.stringify({ lines }));
  notify(slug);
}

export function subscribe(slug: string, listener: Listener): () => void {
  let listeners = listenersBySlug.get(slug);

  if (!listeners) {
    listeners = new Set();
    listenersBySlug.set(slug, listeners);
  }

  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

window.addEventListener('storage', (event) => {
  if (!event.key) {
    return;
  }

  for (const slug of listenersBySlug.keys()) {
    if (event.key === cartKey(slug)) {
      snapshots.delete(slug);
      notify(slug);
    }
  }
});
