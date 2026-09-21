import {
  subscribeToUserEvents,
  type RealtimeClientLike,
  type UserEventHandlers,
} from './realtimeChannel';
import { getSupabase } from './supabase';

/**
 * Starts listening to the signed-in user's private Realtime channel.
 * Not used by any screen yet. Chat and the notification inbox use it from Day 5.
 */
export function startUserEvents(userId: string, handlers: UserEventHandlers): () => void {
  // The real client has the same runtime shape; the narrow type keeps the wrapper testable.
  return subscribeToUserEvents(getSupabase() as unknown as RealtimeClientLike, userId, handlers);
}
