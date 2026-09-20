import { create } from 'zustand';

import { isValidRecordReference } from '@/domain/recordReference';

/**
 * Remembers a record reference opened while signed out, so the app can return to it
 * after sign-in. Kept in memory only, never written to disk. The reference has no
 * meaning by itself; the server still decides whether the signed-in user may open it.
 */

type PendingRecordState = {
  ref: string | null;
  setPending: (ref: string) => void;
  clearPending: () => void;
};

export const usePendingRecordStore = create<PendingRecordState>()((set) => ({
  ref: null,

  setPending: (ref) => {
    if (isValidRecordReference(ref)) {
      set({ ref });
    }
  },

  clearPending: () => set({ ref: null }),
}));
