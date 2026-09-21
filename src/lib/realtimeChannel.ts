import { mapChannelStatus, userTopic, type ConnectionState } from '@/domain/realtime';

/**
 * Subscribes to a user's private Realtime channel.
 *
 * Always joins a private channel, so the database policies decide whether the join
 * is allowed. The client is passed in so this can be unit tested with a fake.
 */

export const NOTIFICATION_EVENT = 'notification';

export type RealtimeChannelLike = {
  on(
    type: 'broadcast',
    filter: { event: string },
    callback: (message: { payload?: unknown }) => void,
  ): RealtimeChannelLike;
  subscribe(callback?: (status: string) => void): RealtimeChannelLike;
};

export type RealtimeClientLike = {
  channel(topic: string, options: { config: { private: boolean } }): RealtimeChannelLike;
  removeChannel(channel: RealtimeChannelLike): unknown;
};

export type UserEventHandlers = {
  /** Receives event payloads exactly as sent. Consumers must validate them. */
  onEvent: (payload: unknown) => void;
  onState: (state: ConnectionState) => void;
};

/** Starts listening. Returns a function that stops listening. */
export function subscribeToUserEvents(
  client: RealtimeClientLike,
  userId: string,
  handlers: UserEventHandlers,
): () => void {
  const topic = userTopic(userId);
  if (topic === null) {
    handlers.onState('error');
    return () => undefined;
  }

  let stopped = false;
  handlers.onState('connecting');

  const channel = client
    .channel(topic, { config: { private: true } })
    .on('broadcast', { event: NOTIFICATION_EVENT }, (message) => {
      if (!stopped) {
        handlers.onEvent(message.payload);
      }
    })
    .subscribe((status) => {
      if (!stopped) {
        handlers.onState(mapChannelStatus(status));
      }
    });

  return () => {
    if (stopped) {
      return;
    }
    stopped = true;
    client.removeChannel(channel);
    handlers.onState('closed');
  };
}
