import { createChunkedStorage, type AsyncKeyValueBackend } from '../chunkedStorage';

function createFakeBackend() {
  const store = new Map<string, string>();
  const backend: AsyncKeyValueBackend = {
    getItem: async (key) => store.get(key) ?? null,
    setItem: async (key, value) => {
      store.set(key, value);
    },
    removeItem: async (key) => {
      store.delete(key);
    },
  };
  return { store, backend };
}

const SYNTHETIC_SESSION = 'synthetic-session-'.repeat(300); // 5,400 characters

describe('createChunkedStorage', () => {
  it('returns null for a key that was never stored', async () => {
    const { backend } = createFakeBackend();
    const storage = createChunkedStorage(backend, 100);

    expect(await storage.getItem('missing')).toBeNull();
  });

  it('stores a long value in small chunks and reads it back unchanged', async () => {
    const { store, backend } = createFakeBackend();
    const storage = createChunkedStorage(backend, 100);

    await storage.setItem('session', SYNTHETIC_SESSION);

    expect(await storage.getItem('session')).toBe(SYNTHETIC_SESSION);
    for (const [key, value] of store.entries()) {
      if (key !== 'session.count') {
        expect(value.length).toBeLessThanOrEqual(100);
      }
    }
    expect(store.get('session.count')).toBe(String(Math.ceil(SYNTHETIC_SESSION.length / 100)));
  });

  it('removes leftover chunks when a shorter value replaces a longer one', async () => {
    const { store, backend } = createFakeBackend();
    const storage = createChunkedStorage(backend, 100);

    await storage.setItem('session', SYNTHETIC_SESSION);
    await storage.setItem('session', 'short-value');

    expect(await storage.getItem('session')).toBe('short-value');
    expect(Array.from(store.keys()).sort()).toEqual(['session.0', 'session.count']);
  });

  it('removes every chunk when the item is removed', async () => {
    const { store, backend } = createFakeBackend();
    const storage = createChunkedStorage(backend, 100);

    await storage.setItem('session', SYNTHETIC_SESSION);
    await storage.removeItem('session');

    expect(await storage.getItem('session')).toBeNull();
    expect(store.size).toBe(0);
  });

  it('treats a value with a missing chunk as absent', async () => {
    const { store, backend } = createFakeBackend();
    const storage = createChunkedStorage(backend, 100);

    await storage.setItem('session', SYNTHETIC_SESSION);
    store.delete('session.2');

    expect(await storage.getItem('session')).toBeNull();
  });
});
