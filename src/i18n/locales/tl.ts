import type { en } from "./en";

/**
 * Tagalog UI strings (working draft).
 * Typed against the English file, so a missing or extra key is a TypeScript error.
 * Needs review by a Tagalog speaker before pilot use.
 */
export const tl: typeof en = {
  app: {
    name: "BHW Care",
  },
  common: {
    loading: "Naglo-load…",
    save: "I-save",
    cancel: "Kanselahin",
    retry: "Subukan muli",
    back: "Bumalik",
  },
  sync: {
    synced: "Naka-sync na",
    savedOnDevice: "Naka-save sa device",
    pendingSync: "Naghihintay ng sync",
    syncing: "Nagsi-sync",
    syncFailed: "Nabigo ang sync",
  },
  settings: {
    language: "Wika",
    languageEnglish: "Ingles",
    languageTagalog: "Tagalog",
  },
};
