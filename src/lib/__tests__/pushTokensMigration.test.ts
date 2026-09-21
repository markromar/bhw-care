import { readFileSync } from 'fs';
import { join } from 'path';

const sql = readFileSync(
  join(__dirname, '../../../supabase/migrations/20260921010000_register_push_token.sql'),
  'utf8',
);

describe('register_push_token migration', () => {
  it('is a security definer function with an empty search path', () => {
    expect(sql).toMatch(/security definer/);
    expect(sql).toMatch(/set search_path = ''/);
  });

  it('is executable only by signed-in users', () => {
    expect(sql).toMatch(
      /revoke all on function public\.register_push_token\(text, text\) from public, anon/,
    );
    expect(sql).toMatch(
      /grant execute on function public\.register_push_token\(text, text\) to authenticated/,
    );
  });

  it('always assigns the token to the caller', () => {
    expect(sql).toMatch(/caller uuid := auth\.uid\(\)/);
    expect(sql).toMatch(/values \(caller, p_token, p_platform\)/);
    expect(sql).toMatch(/set user_id = excluded\.user_id/);
  });
});
