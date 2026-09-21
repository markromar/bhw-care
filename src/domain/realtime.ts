/**
 * Realtime topic and connection-state rules.
 *
 * Topics are checked by database policies when a client joins a channel. The app
 * only builds topics for itself and never decides access.
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const USER_TOPIC_PATTERN = /^user:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** The personal topic for a user, or null when the id is not a valid user id. */
export function userTopic(userId: string): string | null {
  return UUID_PATTERN.test(userId) ? `user:${userId.toLowerCase()}` : null;
}

export function isUserTopic(topic: string): boolean {
  return USER_TOPIC_PATTERN.test(topic);
}

export type ConnectionState = 'connecting' | 'connected' | 'error' | 'closed';

/** Maps a Supabase channel status word to a connection state. */
export function mapChannelStatus(status: string): ConnectionState {
  switch (status) {
    case 'SUBSCRIBED':
      return 'connected';
    case 'CHANNEL_ERROR':
    case 'TIMED_OUT':
      return 'error';
    case 'CLOSED':
      return 'closed';
    default:
      return 'connecting';
  }
}
