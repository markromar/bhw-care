import { useSessionStore } from '../sessionStore';

beforeEach(() => {
  useSessionStore.setState(useSessionStore.getInitialState(), true);
});

describe('useSessionStore', () => {
  it('starts in the initializing state with no user', () => {
    const state = useSessionStore.getState();

    expect(state.status).toBe('initializing');
    expect(state.userId).toBeNull();
    expect(state.context).toBeNull();
  });

  it('stores the user and context when signed in', () => {
    const context = {
      status: 'ready' as const,
      roles: ['bhw' as const],
      role: 'bhw' as const,
      barangayId: 'barangay-a',
    };

    useSessionStore.getState().setSignedIn('user-1', context);

    const state = useSessionStore.getState();
    expect(state.status).toBe('signed_in');
    expect(state.userId).toBe('user-1');
    expect(state.context).toEqual(context);
  });

  it('clears everything when signed out', () => {
    useSessionStore.getState().setSignedIn('user-1', { status: 'no_role' });
    useSessionStore.getState().setSignedOut();

    const state = useSessionStore.getState();
    expect(state.status).toBe('signed_out');
    expect(state.userId).toBeNull();
    expect(state.context).toBeNull();
  });

  it('lets a user with several roles choose one of them', () => {
    useSessionStore.getState().setSignedIn('user-1', {
      status: 'needs_role_selection',
      roles: ['bhw', 'pregnant_mother'],
      barangayId: 'barangay-a',
    });

    useSessionStore.getState().selectRole('pregnant_mother');

    expect(useSessionStore.getState().context).toEqual({
      status: 'ready',
      roles: ['bhw', 'pregnant_mother'],
      role: 'pregnant_mother',
      barangayId: 'barangay-a',
    });
  });

  it('refuses a role the server did not give the user', () => {
    const context = {
      status: 'ready' as const,
      roles: ['bhw' as const],
      role: 'bhw' as const,
      barangayId: 'barangay-a',
    };
    useSessionStore.getState().setSignedIn('user-1', context);

    useSessionStore.getState().selectRole('super_admin');

    expect(useSessionStore.getState().context).toEqual(context);
  });
});
