import { createMemoryLocalStore, createRepository, isStale } from '../localStore';

type Note = { text: string };

function parseNote(raw: unknown): Note {
  const text = (raw as { text?: unknown } | null)?.text;
  if (typeof text === 'string') {
    return { text };
  }
  throw new Error('invalid note');
}

const OWNER_A = 'user-a';
const OWNER_B = 'user-b';
const DAY = 24 * 60 * 60 * 1000;

function setup() {
  let now = 1_000_000;
  const clock = () => now;
  const store = createMemoryLocalStore();
  const options = { collection: 'notes', maxAgeMs: 7 * DAY, parse: parseNote, now: clock };

  return {
    store,
    repoA: createRepository(store, { ...options, ownerId: OWNER_A }),
    repoB: createRepository(store, { ...options, ownerId: OWNER_B }),
    advance: (ms: number) => {
      now += ms;
    },
    time: () => now,
  };
}

describe('createRepository', () => {
  it('stores a record and reads it back with its cache time', async () => {
    const { repoA, time } = setup();

    await repoA.put('n1', { text: 'synthetic note' });

    expect(await repoA.get('n1')).toEqual({
      value: { text: 'synthetic note' },
      cachedAt: time(),
      stale: false,
    });
  });

  it('returns null for a record that does not exist', async () => {
    const { repoA } = setup();

    expect(await repoA.get('missing')).toBeNull();
  });

  it('keeps a snapshot, so changing the original does not change the cache', async () => {
    const { repoA } = setup();
    const note = { text: 'before' };

    await repoA.put('n1', note);
    note.text = 'after';

    expect((await repoA.get('n1'))?.value.text).toBe('before');
  });

  it('marks a record stale only after the maximum age has passed', async () => {
    const { repoA, advance } = setup();
    await repoA.put('n1', { text: 'synthetic note' });

    advance(7 * DAY);
    expect((await repoA.get('n1'))?.stale).toBe(false);

    advance(1);
    expect((await repoA.get('n1'))?.stale).toBe(true);
    expect(isStale(0, 7 * DAY, 7 * DAY)).toBe(false);
    expect(isStale(0, 7 * DAY + 1, 7 * DAY)).toBe(true);
  });

  it('never returns one owner’s records to another owner', async () => {
    const { repoA, repoB, store } = setup();
    await repoA.put('n1', { text: 'private to user a' });

    expect(await repoB.get('n1')).toBeNull();
    expect(await repoB.list()).toEqual([]);
    expect(await store.get({ ownerId: OWNER_B, collection: 'notes', id: 'n1' })).toBeNull();
  });

  it('lists only the owner’s records in the collection, oldest first', async () => {
    const { repoA, repoB, store, advance, time } = setup();
    await repoA.put('b', { text: 'second' });
    advance(10);
    await repoA.put('a', { text: 'third' });
    await repoB.put('x', { text: 'other owner' });
    await store.put({ ownerId: OWNER_A, collection: 'other', id: 'y' }, { text: 'other' }, time());

    const items = await repoA.list();

    expect(items.map((item) => item.id)).toEqual(['b', 'a']);
  });

  it('purges only stale records for its own owner and collection', async () => {
    const { repoA, repoB, store, advance, time } = setup();
    await repoA.put('old', { text: 'old' });
    await repoB.put('old', { text: 'other owner old' });
    await store.put({ ownerId: OWNER_A, collection: 'other', id: 'old' }, { text: 'x' }, time());
    advance(8 * DAY);
    await repoA.put('fresh', { text: 'fresh' });

    expect(await repoA.purgeStale()).toBe(1);

    expect(await repoA.get('old')).toBeNull();
    expect((await repoA.get('fresh'))?.value.text).toBe('fresh');
    expect((await repoB.get('old'))?.value.text).toBe('other owner old');
    expect(await store.get({ ownerId: OWNER_A, collection: 'other', id: 'old' })).not.toBeNull();
  });

  it('wipes one owner’s data, or everything', async () => {
    const { repoA, repoB, store } = setup();
    await repoA.put('n1', { text: 'a' });
    await repoB.put('n1', { text: 'b' });

    await store.wipeOwner(OWNER_A);
    expect(await repoA.get('n1')).toBeNull();
    expect(await repoB.get('n1')).not.toBeNull();

    await store.wipeAll();
    expect(await repoB.get('n1')).toBeNull();
  });

  it('ignores stored records that fail validation', async () => {
    const { repoA, store, time } = setup();
    await store.put({ ownerId: OWNER_A, collection: 'notes', id: 'bad' }, { text: 42 }, time());
    await repoA.put('good', { text: 'valid' });

    expect(await repoA.get('bad')).toBeNull();
    expect((await repoA.list()).map((item) => item.id)).toEqual(['good']);
  });

  it('rejects invalid names, ids and values that cannot be stored', async () => {
    const { repoA, store, time } = setup();
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    await expect(repoA.put('bad id!', { text: 'x' })).rejects.toThrow();
    await expect(
      store.put({ ownerId: OWNER_A, collection: 'Bad-Name', id: 'n1' }, {}, time()),
    ).rejects.toThrow();
    await expect(
      store.put({ ownerId: 'bad owner', collection: 'notes', id: 'n1' }, {}, time()),
    ).rejects.toThrow();
    await expect(
      store.put({ ownerId: OWNER_A, collection: 'notes', id: 'n1' }, undefined, time()),
    ).rejects.toThrow();
    await expect(
      store.put({ ownerId: OWNER_A, collection: 'notes', id: 'n1' }, circular, time()),
    ).rejects.toThrow();
  });

  it('refuses a maximum age that is not greater than zero', () => {
    const store = createMemoryLocalStore();

    expect(() =>
      createRepository(store, {
        ownerId: OWNER_A,
        collection: 'notes',
        maxAgeMs: 0,
        parse: parseNote,
      }),
    ).toThrow();
  });
});
