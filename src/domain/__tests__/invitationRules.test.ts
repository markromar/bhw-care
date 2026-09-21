import { readFileSync } from 'fs';
import { join } from 'path';

import {
  canInvite,
  INVITABLE_ROLES,
  invitableRolesFor,
  INVITATION_STATUSES,
  MAX_INVITATION_DAYS,
  normalizeInvitationEmail,
} from '../invitationRules';
import { ROLES } from '../roles';

const sql = readFileSync(
  join(__dirname, '../../../supabase/migrations/20260922000000_role_invitations.sql'),
  'utf8',
);

function quotedValues(pattern: RegExp): string[] {
  const block = sql.match(pattern);
  expect(block).not.toBeNull();
  return ((block?.[1] ?? '').match(/'[a-z_]+'/g) ?? []).map((value) => value.slice(1, -1));
}

describe('invitation rules', () => {
  it('offers a Super Admin only Kapitan, a Kapitan the four staff roles, and others nothing', () => {
    expect(invitableRolesFor('super_admin')).toEqual(['kapitan']);
    expect(invitableRolesFor('kapitan')).toEqual(['admin', 'bhw_head', 'bhw', 'rhu_nurse']);

    for (const role of ROLES.filter((r) => r !== 'super_admin' && r !== 'kapitan')) {
      expect(invitableRolesFor(role)).toEqual([]);
    }
  });

  it('applies the hierarchy and barangay scope in canInvite', () => {
    expect(canInvite('super_admin', 'kapitan', { sameBarangay: false })).toBe(true);
    expect(canInvite('super_admin', 'bhw', { sameBarangay: true })).toBe(false);
    expect(canInvite('kapitan', 'bhw', { sameBarangay: true })).toBe(true);
    expect(canInvite('kapitan', 'bhw', { sameBarangay: false })).toBe(false);
    expect(canInvite('kapitan', 'kapitan', { sameBarangay: true })).toBe(false);
    expect(canInvite('kapitan', 'super_admin', { sameBarangay: true })).toBe(false);
    expect(canInvite('kapitan', 'pregnant_mother', { sameBarangay: true })).toBe(false);

    for (const inviter of ROLES.filter((r) => r !== 'super_admin' && r !== 'kapitan')) {
      for (const target of ROLES) {
        expect(canInvite(inviter, target, { sameBarangay: true })).toBe(false);
      }
    }
  });

  it('normalizes and validates invitation emails', () => {
    expect(normalizeInvitationEmail('  Kapitan.Test@Example.COM ')).toBe(
      'kapitan.test@example.com',
    );

    const invalid = [
      '',
      'not-an-email',
      'a@b',
      'a b@example.com',
      `${'a'.repeat(250)}@example.com`,
    ];
    for (const value of invalid) {
      expect(normalizeInvitationEmail(value)).toBeNull();
    }
  });
});

describe('role_invitations migration', () => {
  it('allows exactly the invitable roles, all of which are real roles', () => {
    const dbRoles = quotedValues(/check \(role in \(([\s\S]*?)\)\)/);

    expect([...dbRoles].sort()).toEqual([...INVITABLE_ROLES].sort());
    for (const role of INVITABLE_ROLES) {
      expect(ROLES).toContain(role);
    }
    expect(dbRoles).not.toContain('super_admin');
    expect(dbRoles).not.toContain('pregnant_mother');
    expect(dbRoles).not.toContain('guardian');
  });

  it('allows exactly the same statuses as the app', () => {
    const dbStatuses = quotedValues(/check \(status in \(([\s\S]*?)\)\)/);

    expect([...dbStatuses].sort()).toEqual([...INVITATION_STATUSES].sort());
  });

  it('enables row level security and gives the app read access only', () => {
    expect(sql).toMatch(/alter table public\.role_invitations enable row level security/);
    expect(sql).toMatch(/grant select on public\.role_invitations to authenticated/);
    expect(sql).not.toMatch(/grant\s+(insert|update|delete|all)[^;]*role_invitations/i);
  });

  it('guards inserts, updates, deletes and truncation with triggers', () => {
    expect(sql).toMatch(/before insert on public\.role_invitations/);
    expect(sql).toMatch(/before update on public\.role_invitations/);
    expect(sql).toMatch(/before delete on public\.role_invitations/);
    expect(sql).toMatch(/before truncate on public\.role_invitations/);
  });

  it('bounds the lifetime to the same number of days as the app', () => {
    expect(sql).toContain(`interval '${MAX_INVITATION_DAYS} days'`);
  });

  it('allows only one pending invitation per email', () => {
    expect(sql).toMatch(/create unique index[\s\S]*?\(email\)\s+where status = 'pending'/);
  });
});
