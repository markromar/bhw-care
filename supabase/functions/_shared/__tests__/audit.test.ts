import { readFileSync } from 'fs';
import { join } from 'path';

import { ROLES } from '../../../../src/domain/roles';
import { AUDIT_ACTOR_ROLES, MAX_AUDIT_DETAILS_LENGTH, validateAuditEvent } from '../audit';

const sql = readFileSync(
  join(__dirname, '../../../migrations/20260922010000_audit_events.sql'),
  'utf8',
);

const USER_ID = '0f8fad5b-d9cb-469f-a165-70867728950e';
const BARANGAY_ID = '1b4e28ba-2fa1-41d2-883f-0016d3cca427';

const VALID = {
  actorId: USER_ID,
  actorRole: 'kapitan',
  action: 'invitation.created',
  entityType: 'role_invitation',
  entityId: 'inv-0001',
  barangayId: BARANGAY_ID,
  syncOperationId: BARANGAY_ID,
  reasonCode: 'initial_invite',
  details: { role: 'bhw', count: 1, flags: ['a', 'b'], ok: true, note: null },
};

describe('validateAuditEvent', () => {
  it('accepts a valid event and returns the row to insert', () => {
    expect(validateAuditEvent(VALID)).toEqual({
      ok: true,
      row: {
        actor_id: USER_ID,
        actor_role: 'kapitan',
        action: 'invitation.created',
        entity_type: 'role_invitation',
        entity_id: 'inv-0001',
        barangay_id: BARANGAY_ID,
        sync_operation_id: BARANGAY_ID,
        reason_code: 'initial_invite',
        details: VALID.details,
      },
    });
  });

  it('defaults optional fields to null, and allows a system event without an actor', () => {
    const result = validateAuditEvent({
      actorRole: 'system',
      action: 'invitation.expired',
      entityType: 'role_invitation',
    });

    expect(result).toEqual({
      ok: true,
      row: {
        actor_id: null,
        actor_role: 'system',
        action: 'invitation.expired',
        entity_type: 'role_invitation',
        entity_id: null,
        barangay_id: null,
        sync_operation_id: null,
        reason_code: null,
        details: {},
      },
    });
  });

  it('rejects invalid fields', () => {
    const invalid = [
      null,
      'text',
      { ...VALID, actorRole: 'doctor' },
      { ...VALID, actorRole: 'bhw', actorId: null },
      { ...VALID, actorId: 'not-a-uuid' },
      { ...VALID, action: 'Invitation Created' },
      { ...VALID, action: '' },
      { ...VALID, entityType: 'Role-Invitation' },
      { ...VALID, entityId: 'a/b' },
      { ...VALID, entityId: 'x'.repeat(101) },
      { ...VALID, barangayId: 'nope' },
      { ...VALID, syncOperationId: 42 },
      { ...VALID, reasonCode: 'Has Spaces' },
    ];

    for (const input of invalid) {
      expect(validateAuditEvent(input).ok).toBe(false);
    }
  });

  it('rejects details that could carry record contents', () => {
    const invalid = [
      { ...VALID, details: [] },
      { ...VALID, details: 'text' },
      { ...VALID, details: { nested: { deep: 1 } } },
      { ...VALID, details: { Bad_Key: 1 } },
      { ...VALID, details: { long: 'x'.repeat(201) } },
      { ...VALID, details: { list: Array.from({ length: 51 }, () => 'a') } },
      { ...VALID, details: { list: [{ a: 1 }] } },
      { ...VALID, details: { number: Number.POSITIVE_INFINITY } },
      {
        ...VALID,
        details: Object.fromEntries(
          Array.from({ length: 30 }, (_, i) => [`k${i}`, 'x'.repeat(190)]),
        ),
      },
    ];

    for (const input of invalid) {
      expect(validateAuditEvent(input).ok).toBe(false);
    }
  });
});

describe('audit_events migration', () => {
  it('allows the app roles plus the system actor', () => {
    const block = sql.match(/check \(actor_role in \(([\s\S]*?)\)\)/);
    expect(block).not.toBeNull();

    const dbRoles = ((block?.[1] ?? '').match(/'[a-z_]+'/g) ?? []).map((v) => v.slice(1, -1));

    expect([...dbRoles].sort()).toEqual([...ROLES, 'system'].sort());
    expect([...AUDIT_ACTOR_ROLES].sort()).toEqual([...ROLES, 'system'].sort());
  });

  it('is append-only, chained and closed to the app roles', () => {
    expect(sql).toMatch(/alter table public\.audit_events enable row level security/);
    expect(sql).toMatch(/revoke all on public\.audit_events from anon, authenticated/);
    expect(sql).not.toMatch(/grant[^;]*audit_events[^;]*(anon|authenticated)/i);
    expect(sql).not.toMatch(/create policy/i);
    expect(sql).toMatch(/before insert on public\.audit_events/);
    expect(sql).toMatch(/before update or delete on public\.audit_events/);
    expect(sql).toMatch(/before truncate on public\.audit_events/);
    expect(sql).toMatch(/pg_advisory_xact_lock/);
    expect(sql).toMatch(/nextval\('public\.audit_events_seq'\)/);
    expect(sql).toContain(`length(details::text) <= ${MAX_AUDIT_DETAILS_LENGTH}`);
  });
});
