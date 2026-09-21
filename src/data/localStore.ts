/**
 * Local persistence boundary.
 *
 * Screens read and write cached data only through this interface, so the storage
 * engine (in memory today, encrypted SQLite later) can change without touching them.
 *
 * Rules enforced here:
 * - Every record is owned by a user. Another user's ID never returns it.
 * - Records remember when they were cached, and reads report when they are stale.
 * - Stale records can be purged, one user's data can be wiped, and everything can
 *   be wiped (on sign-out).
 * - Stored data is JSON, and a repository validates it with a parse function on read.
 *
 * No native imports, so it can be unit tested.
 */

export type RecordKey = {
  ownerId: string;
  collection: string;
  id: string;
};

export type StoredRecord = RecordKey & {
  json: string;
  cachedAt: number;
};

export interface LocalStore {
  put(key: RecordKey, value: unknown, now: number): Promise<void>;
  get(key: RecordKey): Promise<StoredRecord | null>;
  list(ownerId: string, collection: string): Promise<StoredRecord[]>;
  remove(key: RecordKey): Promise<void>;
  purgeOlderThan(ownerId: string, collection: string, cutoff: number): Promise<number>;
  wipeOwner(ownerId: string): Promise<void>;
  wipeAll(): Promise<void>;
}

const COLLECTION_PATTERN = /^[a-z][a-z0-9_]{0,49}$/;
const KEY_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;

function validateScope(ownerId: string, collection: string): void {
  if (!KEY_PATTERN.test(ownerId)) {
    throw new Error('invalid owner id');
  }
  if (!COLLECTION_PATTERN.test(collection)) {
    throw new Error('invalid collection name');
  }
}

function validateRecordKey(key: RecordKey): void {
  validateScope(key.ownerId, key.collection);
  if (!KEY_PATTERN.test(key.id)) {
    throw new Error('invalid record id');
  }
}

function serialize(value: unknown): string {
  const json = JSON.stringify(value);
  if (json === undefined) {
    throw new Error('value is not serializable');
  }
  return json;
}

function byCachedAtThenId(a: StoredRecord, b: StoredRecord): number {
  return a.cachedAt - b.cachedAt || a.id.localeCompare(b.id);
}

/** In-memory store. Holds nothing on disk; used for tests and until SQLite is added. */
export function createMemoryLocalStore(): LocalStore {
  const records = new Map<string, StoredRecord>();
  const mapKey = (key: RecordKey) => `${key.ownerId}|${key.collection}|${key.id}`;

  return {
    async put(key, value, now) {
      validateRecordKey(key);
      records.set(mapKey(key), {
        ownerId: key.ownerId,
        collection: key.collection,
        id: key.id,
        json: serialize(value),
        cachedAt: now,
      });
    },

    async get(key) {
      validateRecordKey(key);
      const record = records.get(mapKey(key));
      return record ? { ...record } : null;
    },

    async list(ownerId, collection) {
      validateScope(ownerId, collection);
      return Array.from(records.values())
        .filter((record) => record.ownerId === ownerId && record.collection === collection)
        .map((record) => ({ ...record }))
        .sort(byCachedAtThenId);
    },

    async remove(key) {
      validateRecordKey(key);
      records.delete(mapKey(key));
    },

    async purgeOlderThan(ownerId, collection, cutoff) {
      validateScope(ownerId, collection);
      let removed = 0;
      for (const [mapped, record] of records) {
        if (
          record.ownerId === ownerId &&
          record.collection === collection &&
          record.cachedAt < cutoff
        ) {
          records.delete(mapped);
          removed += 1;
        }
      }
      return removed;
    },

    async wipeOwner(ownerId) {
      if (!KEY_PATTERN.test(ownerId)) {
        throw new Error('invalid owner id');
      }
      for (const [mapped, record] of records) {
        if (record.ownerId === ownerId) {
          records.delete(mapped);
        }
      }
    },

    async wipeAll() {
      records.clear();
    },
  };
}

/** True when a record is older than the maximum age. */
export function isStale(cachedAt: number, now: number, maxAgeMs: number): boolean {
  return now - cachedAt > maxAgeMs;
}

export type CachedValue<T> = {
  value: T;
  cachedAt: number;
  stale: boolean;
};

export type RepositoryOptions<T> = {
  ownerId: string;
  collection: string;
  /** How long a cached record stays fresh. Comes from configuration; there is no default. */
  maxAgeMs: number;
  /** Validates data read back from storage. Throw to reject a record. */
  parse: (raw: unknown) => T;
  now?: () => number;
};

export type Repository<T> = {
  put(id: string, value: T): Promise<void>;
  get(id: string): Promise<CachedValue<T> | null>;
  list(): Promise<(CachedValue<T> & { id: string })[]>;
  remove(id: string): Promise<void>;
  purgeStale(): Promise<number>;
};

/** A typed, validated view of one collection for one user. */
export function createRepository<T>(
  store: LocalStore,
  options: RepositoryOptions<T>,
): Repository<T> {
  const { ownerId, collection, maxAgeMs, parse } = options;
  const now = options.now ?? Date.now;

  if (!(maxAgeMs > 0)) {
    throw new Error('maxAgeMs must be greater than zero');
  }

  function decode(record: StoredRecord): CachedValue<T> | null {
    try {
      const value = parse(JSON.parse(record.json));
      return {
        value,
        cachedAt: record.cachedAt,
        stale: isStale(record.cachedAt, now(), maxAgeMs),
      };
    } catch {
      // A corrupted or wrongly shaped record is ignored, never returned.
      return null;
    }
  }

  return {
    put: (id, value) => store.put({ ownerId, collection, id }, value, now()),

    async get(id) {
      const record = await store.get({ ownerId, collection, id });
      return record === null ? null : decode(record);
    },

    async list() {
      const records = await store.list(ownerId, collection);
      const results: (CachedValue<T> & { id: string })[] = [];
      for (const record of records) {
        const decoded = decode(record);
        if (decoded !== null) {
          results.push({ ...decoded, id: record.id });
        }
      }
      return results;
    },

    remove: (id) => store.remove({ ownerId, collection, id }),

    purgeStale: () => store.purgeOlderThan(ownerId, collection, now() - maxAgeMs),
  };
}
