import { NOTIFICATION_EVENT, subscribeToUserEvents } from '../realtimeChannel';

const USER_ID = '0f8fad5b-d9cb-469f-a165-70867728950e';

function createFakeClient() {
  let onStatus: ((status: string) => void) | undefined;
  let onBroadcast: ((message: { payload?: unknown }) => void) | undefined;
  let eventFilter: unknown;

  const channel: { on: jest.Mock; subscribe: jest.Mock } = {
    on: jest.fn(),
    subscribe: jest.fn(),
  };
  channel.on.mockImplementation((_type: string, filter: unknown, callback) => {
    eventFilter = filter;
    onBroadcast = callback;
    return channel;
  });
  channel.subscribe.mockImplementation((callback) => {
    onStatus = callback;
    return channel;
  });

  const client = {
    channel: jest.fn().mockReturnValue(channel),
    removeChannel: jest.fn(),
  };

  return {
    client,
    channel,
    getFilter: () => eventFilter,
    emitStatus: (status: string) => onStatus?.(status),
    emitBroadcast: (message: { payload?: unknown }) => onBroadcast?.(message),
  };
}

describe('subscribeToUserEvents', () => {
  it('joins a private channel on the user’s own topic and listens for notifications', () => {
    const { client, getFilter } = createFakeClient();

    subscribeToUserEvents(client, USER_ID, { onEvent: jest.fn(), onState: jest.fn() });

    expect(client.channel).toHaveBeenCalledWith(`user:${USER_ID}`, { config: { private: true } });
    expect(getFilter()).toEqual({ event: NOTIFICATION_EVENT });
  });

  it('reports connecting, then the state for each channel status', () => {
    const { client, emitStatus } = createFakeClient();
    const states: string[] = [];

    subscribeToUserEvents(client, USER_ID, {
      onEvent: jest.fn(),
      onState: (state) => states.push(state),
    });
    emitStatus('SUBSCRIBED');
    emitStatus('CHANNEL_ERROR');
    emitStatus('TIMED_OUT');
    emitStatus('CLOSED');

    expect(states).toEqual(['connecting', 'connected', 'error', 'error', 'closed']);
  });

  it('passes broadcast payloads to the handler', () => {
    const { client, emitBroadcast } = createFakeClient();
    const onEvent = jest.fn();

    subscribeToUserEvents(client, USER_ID, { onEvent, onState: jest.fn() });
    emitBroadcast({ payload: { hello: 'synthetic' } });

    expect(onEvent).toHaveBeenCalledWith({ hello: 'synthetic' });
  });

  it('refuses an invalid user id without opening a channel', () => {
    const { client } = createFakeClient();
    const states: string[] = [];

    const stop = subscribeToUserEvents(client, 'not-a-user-id', {
      onEvent: jest.fn(),
      onState: (state) => states.push(state),
    });

    expect(states).toEqual(['error']);
    expect(client.channel).not.toHaveBeenCalled();
    expect(() => stop()).not.toThrow();
  });

  it('stops once, then ignores later statuses and events', () => {
    const { client, channel, emitStatus, emitBroadcast } = createFakeClient();
    const states: string[] = [];
    const onEvent = jest.fn();

    const stop = subscribeToUserEvents(client, USER_ID, {
      onEvent,
      onState: (state) => states.push(state),
    });
    stop();
    stop();
    emitStatus('SUBSCRIBED');
    emitBroadcast({ payload: 'late' });

    expect(client.removeChannel).toHaveBeenCalledTimes(1);
    expect(client.removeChannel).toHaveBeenCalledWith(channel);
    expect(states).toEqual(['connecting', 'closed']);
    expect(onEvent).not.toHaveBeenCalled();
  });
});
