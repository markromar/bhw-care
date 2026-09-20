import { resolveSessionContext } from '../sessionContext';

describe('resolveSessionContext', () => {
  it('returns no_role when the user has no role rows', () => {
    expect(resolveSessionContext([])).toEqual({ status: 'no_role' });
  });

  it('ignores rows with unknown roles', () => {
    const rows = [{ role: 'doctor', barangay_id: 'barangay-a' }];

    expect(resolveSessionContext(rows)).toEqual({ status: 'no_role' });
  });

  it('is ready when the user has exactly one role', () => {
    const rows = [{ role: 'bhw', barangay_id: 'barangay-a' }];

    expect(resolveSessionContext(rows)).toEqual({
      status: 'ready',
      roles: ['bhw'],
      role: 'bhw',
      barangayId: 'barangay-a',
    });
  });

  it('allows Super Admin without a barangay', () => {
    const rows = [{ role: 'super_admin', barangay_id: null }];

    expect(resolveSessionContext(rows)).toEqual({
      status: 'ready',
      roles: ['super_admin'],
      role: 'super_admin',
      barangayId: null,
    });
  });

  it('asks the user to choose when several roles share one barangay', () => {
    const rows = [
      { role: 'bhw', barangay_id: 'barangay-a' },
      { role: 'pregnant_mother', barangay_id: 'barangay-a' },
    ];

    expect(resolveSessionContext(rows)).toEqual({
      status: 'needs_role_selection',
      roles: ['bhw', 'pregnant_mother'],
      barangayId: 'barangay-a',
    });
  });

  it('rejects roles that point to more than one barangay', () => {
    const rows = [
      { role: 'bhw', barangay_id: 'barangay-a' },
      { role: 'pregnant_mother', barangay_id: 'barangay-b' },
    ];

    expect(resolveSessionContext(rows)).toEqual({ status: 'invalid_scope' });
  });

  it('treats duplicate rows for the same role as one role', () => {
    const rows = [
      { role: 'bhw', barangay_id: 'barangay-a' },
      { role: 'bhw', barangay_id: 'barangay-a' },
    ];

    expect(resolveSessionContext(rows)).toEqual({
      status: 'ready',
      roles: ['bhw'],
      role: 'bhw',
      barangayId: 'barangay-a',
    });
  });
});
