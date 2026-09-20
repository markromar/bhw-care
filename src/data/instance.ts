import { createMemoryLocalStore, type LocalStore } from './localStore';

/**
 * The app's single local store.
 *
 * Today this is in memory only: nothing is written to disk and nothing is cached yet.
 * The encrypted SQLite adapter replaces this one line later, without touching screens.
 */
export const localStore: LocalStore = createMemoryLocalStore();
