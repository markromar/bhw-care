import { readFileSync } from 'fs';
import { join } from 'path';

import { checkTransition, DELIVERY_STATUSES } from '../deliveryStatus';

describe('delivery status rules', () => {
  it('defines the same statuses as the notification_deliveries table', () => {
    const migrationPath = join(__dirname, '../../../migrations/20260920010000_notifications.sql');
    const sql = readFileSync(migrationPath, 'utf8');

    const block = sql.match(/check \(status in \(([\s\S]*?)\)\)/);
    expect(block).not.toBeNull();

    const quoted = (block?.[1] ?? '').match(/'[a-z_]+'/g) ?? [];
    const dbStatuses = quoted.map((value) => value.slice(1, -1));

    expect([...dbStatuses].sort()).toEqual([...DELIVERY_STATUSES].sort());
  });

  it('allows the normal path when delivery evidence exists', () => {
    expect(checkTransition('scheduled', 'queued')).toEqual({ ok: true });
    expect(checkTransition('queued', 'sending')).toEqual({ ok: true });
    expect(checkTransition('sending', 'accepted')).toEqual({ ok: true });
    expect(checkTransition('accepted', 'delivered', { deliveryEvidence: true })).toEqual({
      ok: true,
    });
  });

  it('refuses delivered without provider evidence', () => {
    const expected = { ok: false, reason: 'delivery_evidence_required' };

    expect(checkTransition('accepted', 'delivered')).toEqual(expected);
    expect(checkTransition('accepted', 'delivered', { deliveryEvidence: false })).toEqual(expected);
  });

  it('allows a retry after failure only below the attempt limit', () => {
    expect(checkTransition('failed', 'queued', { attemptCount: 2 })).toEqual({ ok: true });
    expect(checkTransition('failed', 'queued', { attemptCount: 3 })).toEqual({
      ok: false,
      reason: 'retry_limit_reached',
    });
    expect(checkTransition('failed', 'queued', { attemptCount: 1, maxAttempts: 1 })).toEqual({
      ok: false,
      reason: 'retry_limit_reached',
    });
  });

  it('never retries an unknown outcome directly', () => {
    expect(checkTransition('unknown', 'queued')).toEqual({ ok: false, reason: 'not_allowed' });
    expect(checkTransition('unknown', 'failed')).toEqual({ ok: true });
  });

  it('has no way out of terminal states', () => {
    for (const from of ['delivered', 'cancelled', 'superseded'] as const) {
      for (const to of DELIVERY_STATUSES) {
        expect(checkTransition(from, to, { deliveryEvidence: true })).toEqual({
          ok: false,
          reason: 'not_allowed',
        });
      }
    }
  });

  it('refuses jumps that skip a step', () => {
    expect(checkTransition('queued', 'delivered', { deliveryEvidence: true })).toEqual({
      ok: false,
      reason: 'not_allowed',
    });
    expect(checkTransition('scheduled', 'sending')).toEqual({ ok: false, reason: 'not_allowed' });
    expect(checkTransition('sending', 'delivered', { deliveryEvidence: true })).toEqual({
      ok: false,
      reason: 'not_allowed',
    });
  });
});
