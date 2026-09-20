import { create } from 'zustand';

import type { Role } from '@/domain/roles';
import type { ResolvedContext } from '@/domain/sessionContext';

/**
 * Ephemeral session state for the UI.
 *
 * Holds who is signed in and which role context the shell should use. It is not a
 * security boundary: the database decides what data any request may read or write.
 */

export type SessionStatus = 'initializing' | 'signed_out' | 'signed_in';

type SessionState = {
  status: SessionStatus;
  userId: string | null;
  context: ResolvedContext | null;
  setSignedOut: () => void;
  setSignedIn: (userId: string, context: ResolvedContext) => void;
  selectRole: (role: Role) => void;
};

export const useSessionStore = create<SessionState>()((set) => ({
  status: 'initializing',
  userId: null,
  context: null,

  setSignedOut: () => set({ status: 'signed_out', userId: null, context: null }),

  setSignedIn: (userId, context) => set({ status: 'signed_in', userId, context }),

  // Only roles the server already returned for this user can be chosen.
  selectRole: (role) =>
    set((state) => {
      const context = state.context;
      if (context === null) {
        return state;
      }
      if (context.status !== 'needs_role_selection' && context.status !== 'ready') {
        return state;
      }
      if (!context.roles.includes(role)) {
        return state;
      }
      return {
        context: {
          status: 'ready',
          roles: context.roles,
          role,
          barangayId: context.barangayId,
        },
      };
    }),
}));
