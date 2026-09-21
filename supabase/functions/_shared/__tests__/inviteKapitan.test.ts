import { handleInviteKapitan, type InviteKapitanDeps } from '../inviteKapitan';

const CALLER = { userId: '0f8fad5b-d9cb-469f-a165-70867728950e', assuranceLevel: 'aal2' as const };
const BARANGAY_ID = '1b4e28ba-2fa1-41d2-883f-0016d3cca427';

function createDeps(overrides: Partial<InviteKapitanDeps> = {}): InviteKapitanDeps {
  return {
    getRole: jest.fn().mockResolvedValue({ isSuperAdmin: true }),
    getBarangay: jest.fn().mockResolvedValue({ exists: true, status: 'active' }),
    createInvitation: jest.fn().mockResolvedValue({ id: 'inv-1', tokenReference: 'ref-1' }),
    writeAudit: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const VALID_REQUEST = { email: '  Kapitan.Test@Example.com ', barangayId: BARANGAY_ID };

describe('handleInviteKapitan', () => {
  it('creates the invitation and writes an audit event for a verified Super Admin', async () => {
    const deps = createDeps();

    const result = await handleInviteKapitan(CALLER, VALID_REQUEST, deps);

    expect(result).toEqual({ ok: true, status: 200, body: { invitationId: 'inv-1' } });
    expect(deps.createInvitation).toHaveBeenCalledWith({
      email: 'kapitan.test@example.com',
      barangayId: BARANGAY_ID,
      invitedBy: CALLER.userId,
    });
    expect(deps.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: CALLER.userId, action: 'invitation.created' }),
    );
  });

  it('refuses when nobody is signed in', async () => {
    const deps = createDeps();

    const result = await handleInviteKapitan(null, VALID_REQUEST, deps);

    expect(result).toEqual({ ok: false, status: 401, body: { error: 'not_authenticated' } });
    expect(deps.getRole).not.toHaveBeenCalled();
  });

  it('refuses when the session is not aal2, even for a Super Admin', async () => {
    const deps = createDeps();

    const result = await handleInviteKapitan(
      { userId: CALLER.userId, assuranceLevel: 'aal1' },
      VALID_REQUEST,
      deps,
    );

    expect(result).toEqual({
      ok: false,
      status: 403,
      body: { error: 'mfa_verification_required' },
    });
    expect(deps.getRole).not.toHaveBeenCalled();
  });

  it('refuses a null assurance level', async () => {
    const deps = createDeps();

    const result = await handleInviteKapitan(
      { userId: CALLER.userId, assuranceLevel: null },
      VALID_REQUEST,
      deps,
    );

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ status: 403 });
  });

  it('refuses a verified caller who is not a Super Admin', async () => {
    const deps = createDeps({ getRole: jest.fn().mockResolvedValue({ isSuperAdmin: false }) });

    const result = await handleInviteKapitan(CALLER, VALID_REQUEST, deps);

    expect(result).toEqual({ ok: false, status: 403, body: { error: 'not_super_admin' } });
    expect(deps.createInvitation).not.toHaveBeenCalled();
  });

  it('rejects an invalid email without touching the database', async () => {
    const deps = createDeps();

    const result = await handleInviteKapitan(
      CALLER,
      { email: 'not-an-email', barangayId: BARANGAY_ID },
      deps,
    );

    expect(result).toEqual({ ok: false, status: 400, body: { error: 'invalid_email' } });
    expect(deps.getBarangay).not.toHaveBeenCalled();
  });

  it('rejects a missing or unknown barangay', async () => {
    const deps = createDeps({ getBarangay: jest.fn().mockResolvedValue(null) });

    const missing = await handleInviteKapitan(CALLER, { ...VALID_REQUEST, barangayId: '' }, deps);
    const unknown = await handleInviteKapitan(CALLER, VALID_REQUEST, deps);

    expect(missing).toEqual({ ok: false, status: 400, body: { error: 'invalid_barangay' } });
    expect(unknown).toEqual({ ok: false, status: 404, body: { error: 'barangay_not_found' } });
  });

  it('refuses a suspended barangay', async () => {
    const deps = createDeps({
      getBarangay: jest.fn().mockResolvedValue({ exists: true, status: 'suspended' }),
    });

    const result = await handleInviteKapitan(CALLER, VALID_REQUEST, deps);

    expect(result).toEqual({ ok: false, status: 400, body: { error: 'barangay_suspended' } });
  });

  it('reports failure when creating the invitation throws', async () => {
    const deps = createDeps({
      createInvitation: jest.fn().mockRejectedValue(new Error('duplicate pending invitation')),
    });

    const result = await handleInviteKapitan(CALLER, VALID_REQUEST, deps);

    expect(result).toEqual({
      ok: false,
      status: 500,
      body: { error: 'invitation_creation_failed' },
    });
  });

  it('still returns success if only the audit write fails', async () => {
    const deps = createDeps({ writeAudit: jest.fn().mockRejectedValue(new Error('down')) });

    const result = await handleInviteKapitan(CALLER, VALID_REQUEST, deps);

    expect(result).toEqual({ ok: true, status: 200, body: { invitationId: 'inv-1' } });
  });
});
