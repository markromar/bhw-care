import { syncSession } from '../sessionLoader';

function createSink() {
  return { setSignedOut: jest.fn(), setSignedIn: jest.fn() };
}

describe('syncSession', () => {
  it('signs out without looking up roles when there is no user', async () => {
    const sink = createSink();
    const fetchRoleRows = jest.fn();

    const result = await syncSession(null, fetchRoleRows, sink);

    expect(result).toBe('signed_out');
    expect(sink.setSignedOut).toHaveBeenCalledTimes(1);
    expect(fetchRoleRows).not.toHaveBeenCalled();
  });

  it('signs in with the resolved context when the user has one role', async () => {
    const sink = createSink();
    const fetchRoleRows = jest.fn().mockResolvedValue([{ role: 'bhw', barangay_id: 'barangay-a' }]);

    const result = await syncSession('user-1', fetchRoleRows, sink);

    expect(result).toBe('signed_in');
    expect(fetchRoleRows).toHaveBeenCalledWith('user-1');
    expect(sink.setSignedIn).toHaveBeenCalledWith('user-1', {
      status: 'ready',
      roles: ['bhw'],
      role: 'bhw',
      barangayId: 'barangay-a',
    });
  });

  it('passes a role-selection context through when the user has several roles', async () => {
    const sink = createSink();
    const fetchRoleRows = jest.fn().mockResolvedValue([
      { role: 'bhw', barangay_id: 'barangay-a' },
      { role: 'pregnant_mother', barangay_id: 'barangay-a' },
    ]);

    await syncSession('user-1', fetchRoleRows, sink);

    expect(sink.setSignedIn).toHaveBeenCalledWith('user-1', {
      status: 'needs_role_selection',
      roles: ['bhw', 'pregnant_mother'],
      barangayId: 'barangay-a',
    });
  });

  it('fails closed when the role lookup throws', async () => {
    const sink = createSink();
    const fetchRoleRows = jest.fn().mockRejectedValue(new Error('network down'));

    const result = await syncSession('user-1', fetchRoleRows, sink);

    expect(result).toBe('failed');
    expect(sink.setSignedOut).toHaveBeenCalledTimes(1);
    expect(sink.setSignedIn).not.toHaveBeenCalled();
  });
});
