import { readFileSync } from 'fs';
import { join } from 'path';

import { getShellKind, isResidentRole, isRole, ROLES } from '../roles';

describe('roles', () => {
  it('recognizes every defined role and rejects anything else', () => {
    for (const role of ROLES) {
      expect(isRole(role)).toBe(true);
    }
    expect(isRole('doctor')).toBe(false);
    expect(isRole('')).toBe(false);
    expect(isRole(null)).toBe(false);
    expect(isRole(undefined)).toBe(false);
  });

  it('gives only Super Admin the drawer shell', () => {
    expect(getShellKind('super_admin')).toBe('drawer');
    for (const role of ROLES.filter((r) => r !== 'super_admin')) {
      expect(getShellKind(role)).toBe('bottom_tabs');
    }
  });

  it('marks only pregnant mothers and guardians as resident roles', () => {
    const residents = ROLES.filter((role) => isResidentRole(role));
    expect(residents).toEqual(['pregnant_mother', 'guardian']);
  });

  it('matches the role list in the database migration', () => {
    const migrationPath = join(
      __dirname,
      '../../../supabase/migrations/20260920000000_base_schema.sql',
    );
    const sql = readFileSync(migrationPath, 'utf8');

    const block = sql.match(/check \(role in \(([\s\S]*?)\)\)/);
    expect(block).not.toBeNull();

    const quotedRoles = (block?.[1] ?? '').match(/'[a-z_]+'/g) ?? [];
    const dbRoles = quotedRoles.map((quoted) => quoted.slice(1, -1));

    expect([...dbRoles].sort()).toEqual([...ROLES].sort());
  });
});
