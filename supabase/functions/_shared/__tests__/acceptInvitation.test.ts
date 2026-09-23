import { handleAcceptInvitation, type AcceptInvitationDeps } from '../acceptInvitation';

const CALLER = { userId: '0f8fad5b-d9cb-469f-a165-70867728950e' };
const BARANGAY_ID = '1b4e28ba-2fa1-41d2-883f-0016d3cca427';
const FUTURE = new Date(Date.now() + 60 * 60 * 1000).toISOString();
const PAST = new Date(Date.now() - 60 * 60 * 1000).toISOString();

const PENDING_INVITATION = {
  id: 'inv-1',
  role: 'kapitan',
  barangayId: BARANGAY_ID,
  expiresAt: FUTURE,
};

function createDeps(overrides: Partial<AcceptInvitationDeps> = {}): AcceptInvitationDeps {
  return {
    findPendingInvitation: jest.fn().mockResolvedValue(PENDING_INVITATION),
    createProfile: jest.fn().mockResolvedValue(undefined),
    assignRole: jest.fn().mockResolvedValue(undefined),
    markAccepted: jest.fn().mockResolvedValue(true),
    writeAudit: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('handleAcceptInvitation', () => {
  it('creates the profile, assigns the locked role and barangay, closes the invitation, and audits', async () => {
    const deps = createDeps();

    const result = await handleAcceptInvitation(CALLER, deps);

    expect(result).toEqual({
      ok: true,
      status: 200,
      body: { role: 'kapitan', barangayId: BARANGAY_ID },
    });
    expect(deps.createProfile).toHaveBeenCalledWith(CALLER.userId);
    expect(deps.assignRole).toHaveBeenCalledWith({
      userId: CALLER.userId,
      role: 'kapitan',
      barangayId: BARANGAY_ID,
    });
    expect(deps.markAccepted).toHaveBeenCalledWith('inv-1', CALLER.userId);
    expect(deps.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: CALLER.userId, action: 'invitation.accepted' }),
    );
  });

  it('refuses when nobody is signed in', async () => {
    const deps = createDeps();

    const result = await handleAcceptInvitation(null, deps);

    expect(result).toEqual({ ok: false, status: 401, body: { error: 'not_authenticated' } });
    expect(deps.findPendingInvitation).not.toHaveBeenCalled();
  });

  it('refuses when there is no matching pending invitation for this user', async () => {
    const deps = createDeps({ findPendingInvitation: jest.fn().mockResolvedValue(null) });

    const result = await handleAcceptInvitation(CALLER, deps);

    expect(result).toEqual({ ok: false, status: 404, body: { error: 'no_pending_invitation' } });
    expect(deps.createProfile).not.toHaveBeenCalled();
  });

  it('refuses an expired invitation without writing anything', async () => {
    const deps = createDeps({
      findPendingInvitation: jest
        .fn()
        .mockResolvedValue({ ...PENDING_INVITATION, expiresAt: PAST }),
    });

    const result = await handleAcceptInvitation(CALLER, deps);

    expect(result).toEqual({ ok: false, status: 409, body: { error: 'invitation_expired' } });
    expect(deps.createProfile).not.toHaveBeenCalled();
    expect(deps.assignRole).not.toHaveBeenCalled();
  });

  it('never takes role or barangay from anywhere except the invitation row', async () => {
    const deps = createDeps({
      findPendingInvitation: jest.fn().mockResolvedValue({
        id: 'inv-2',
        role: 'bhw',
        barangayId: 'other-barangay',
        expiresAt: FUTURE,
      }),
    });

    await handleAcceptInvitation(CALLER, deps);

    expect(deps.assignRole).toHaveBeenCalledWith({
      userId: CALLER.userId,
      role: 'bhw',
      barangayId: 'other-barangay',
    });
  });

  it('reports failure and stops if profile creation fails', async () => {
    const deps = createDeps({
      createProfile: jest.fn().mockRejectedValue(new Error('db down')),
    });

    const result = await handleAcceptInvitation(CALLER, deps);

    expect(result).toEqual({ ok: false, status: 500, body: { error: 'profile_creation_failed' } });
    expect(deps.assignRole).not.toHaveBeenCalled();
  });

  it('reports failure and stops if role assignment fails', async () => {
    const deps = createDeps({
      assignRole: jest.fn().mockRejectedValue(new Error('db down')),
    });

    const result = await handleAcceptInvitation(CALLER, deps);

    expect(result).toEqual({ ok: false, status: 500, body: { error: 'role_assignment_failed' } });
    expect(deps.markAccepted).not.toHaveBeenCalled();
  });

  it('reports a conflict if the invitation could not be closed (e.g. expired mid-flight)', async () => {
    const deps = createDeps({ markAccepted: jest.fn().mockResolvedValue(false) });

    const result = await handleAcceptInvitation(CALLER, deps);

    expect(result).toEqual({
      ok: false,
      status: 409,
      body: { error: 'invitation_could_not_be_closed' },
    });
    expect(deps.writeAudit).not.toHaveBeenCalled();
  });

  it('still returns success if only the audit write fails', async () => {
    const deps = createDeps({ writeAudit: jest.fn().mockRejectedValue(new Error('down')) });

    const result = await handleAcceptInvitation(CALLER, deps);

    expect(result).toEqual({
      ok: true,
      status: 200,
      body: { role: 'kapitan', barangayId: BARANGAY_ID },
    });
  });
});
