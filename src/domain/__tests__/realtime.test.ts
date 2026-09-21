import { readFileSync } from 'fs';
import { join } from 'path';

import { isUserTopic, mapChannelStatus, userTopic } from '../realtime';

const USER_ID = '0f8fad5b-d9cb-469f-a165-70867728950e';

describe('userTopic', () => {
  it('builds a lowercase personal topic for a valid user id', () => {
    expect(userTopic(USER_ID)).toBe(`user:${USER_ID}`);
    expect(userTopic(USER_ID.toUpperCase())).toBe(`user:${USER_ID}`);
  });

  it('returns null for anything that is not a user id', () => {
    const invalid = ['', 'abc', 'user:abc', `${USER_ID}x`, `x${USER_ID}`, `${USER_ID}/extra`];

    for (const value of invalid) {
      expect(userTopic(value)).toBeNull();
    }
  });

  it('recognizes personal topics only', () => {
    expect(isUserTopic(`user:${USER_ID}`)).toBe(true);
    expect(isUserTopic(USER_ID)).toBe(false);
    expect(isUserTopic('conversation:123')).toBe(false);
    expect(isUserTopic(`user:${USER_ID.toUpperCase()}`)).toBe(false);
  });
});

describe('mapChannelStatus', () => {
  it('maps Supabase channel statuses to connection states', () => {
    expect(mapChannelStatus('SUBSCRIBED')).toBe('connected');
    expect(mapChannelStatus('CHANNEL_ERROR')).toBe('error');
    expect(mapChannelStatus('TIMED_OUT')).toBe('error');
    expect(mapChannelStatus('CLOSED')).toBe('closed');
    expect(mapChannelStatus('JOINING')).toBe('connecting');
    expect(mapChannelStatus('something new')).toBe('connecting');
  });
});

describe('realtime authorization migration', () => {
  const sql = readFileSync(
    join(__dirname, '../../../supabase/migrations/20260921020000_realtime_authorization.sql'),
    'utf8',
  );

  it('lets signed-in users receive broadcasts only', () => {
    expect(sql).toMatch(/on realtime\.messages/);
    expect(sql).toMatch(/for select/);
    expect(sql).toMatch(/to authenticated/);
    expect(sql).toMatch(/extension = 'broadcast'/);
  });

  it('restricts access to the caller’s own topic', () => {
    expect(sql).toMatch(/'user:' \|\| \(select auth\.uid\(\)\)::text/);
    expect(sql).toMatch(/\(select realtime\.topic\(\)\)/);
  });

  it('creates no policy that lets app clients send or change messages', () => {
    expect(sql).not.toMatch(/for\s+(insert|update|delete|all)\b/i);
  });
});
