/**
 * Chunked key-value storage.
 *
 * Secure storage backends can be uncomfortable with large values, and an
 * authentication session can be big. This wrapper splits a value into small
 * chunks, stores each chunk under its own key, and joins them on read.
 *
 * It contains no native code, so it can be unit tested with an in-memory backend.
 */

export type AsyncKeyValueBackend = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

export const DEFAULT_CHUNK_SIZE = 1800;

export function createChunkedStorage(
  backend: AsyncKeyValueBackend,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
): AsyncKeyValueBackend {
  // Key names use only letters, digits, dots, dashes and underscores,
  // which secure storage backends accept.
  const countKey = (key: string) => `${key}.count`;
  const chunkKey = (key: string, index: number) => `${key}.${index}`;

  async function readCount(key: string): Promise<number> {
    const raw = await backend.getItem(countKey(key));
    if (raw === null) {
      return 0;
    }
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  async function removeItem(key: string): Promise<void> {
    const count = await readCount(key);
    for (let index = 0; index < count; index += 1) {
      await backend.removeItem(chunkKey(key, index));
    }
    await backend.removeItem(countKey(key));
  }

  async function getItem(key: string): Promise<string | null> {
    const count = await readCount(key);
    if (count === 0) {
      return null;
    }

    const parts: string[] = [];
    for (let index = 0; index < count; index += 1) {
      const part = await backend.getItem(chunkKey(key, index));
      if (part === null) {
        // A missing piece means the stored value is incomplete. Treat it as absent.
        return null;
      }
      parts.push(part);
    }
    return parts.join("");
  }

  async function setItem(key: string, value: string): Promise<void> {
    const previousCount = await readCount(key);

    const chunks: string[] = [];
    for (let start = 0; start < value.length; start += chunkSize) {
      chunks.push(value.slice(start, start + chunkSize));
    }

    for (let index = 0; index < chunks.length; index += 1) {
      await backend.setItem(chunkKey(key, index), chunks[index]);
    }
    await backend.setItem(countKey(key), String(chunks.length));

    // If the new value is shorter than the old one, remove the leftover chunks.
    for (let index = chunks.length; index < previousCount; index += 1) {
      await backend.removeItem(chunkKey(key, index));
    }
  }

  return { getItem, setItem, removeItem };
}
