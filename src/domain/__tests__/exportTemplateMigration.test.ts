import { readFileSync } from 'fs';
import { join } from 'path';

import { EXPORT_RECORD_TYPES } from '../exportTemplate';

const sql = readFileSync(
  join(__dirname, '../../../supabase/migrations/20260921000000_export_template_versions.sql'),
  'utf8',
);

describe('export_template_versions migration', () => {
  it('allows the same record types as the app', () => {
    const block = sql.match(/check \(record_type in \(([\s\S]*?)\)\)/);
    expect(block).not.toBeNull();

    const quoted = (block?.[1] ?? '').match(/'[a-z_]+'/g) ?? [];
    const dbTypes = quoted.map((value) => value.slice(1, -1));

    expect([...dbTypes].sort()).toEqual([...EXPORT_RECORD_TYPES].sort());
  });

  it('enables row level security and gives the app read access only', () => {
    expect(sql).toMatch(/alter table public\.export_template_versions enable row level security/);
    expect(sql).toMatch(/grant select on public\.export_template_versions to authenticated/);
    expect(sql).not.toMatch(/grant\s+(insert|update|delete|all)[^;]*export_template_versions/i);
  });

  it('blocks updates, deletes and truncation with triggers', () => {
    expect(sql).toMatch(/before update or delete on public\.export_template_versions/);
    expect(sql).toMatch(/before truncate on public\.export_template_versions/);
  });
});
