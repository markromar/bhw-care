// @ts-nocheck -- Deno Edge Function runtime (Deno.serve, Deno.env, jsr: imports). Not
// checked by our Node/tsc tooling; excluded in tsconfig.json. Deno checks it when it
// bundles and runs the function. Real logic lives in _shared/inviteKapitan.ts and is
// covered by Jest + tsc.
// Deno Edge Function. Deployed with: npx supabase functions deploy invite-kapitan
// Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, which Supabase provides
// automatically to every deployed function. Neither is in this repository.
import { createClient } from 'jsr:@supabase/supabase-js@2';

import { handleInviteKapitan, type CallerInfo } from '../_shared/inviteKapitan.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405 });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');

  // Anon client, scoped to the caller's own JWT: used only to identify who is calling.
  const callerClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });

  // Service role client: bypasses RLS. Used only for the checks and writes this
  // function is trusted to perform, never exposed to the request body.
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  let caller: CallerInfo | null = null;
  if (jwt !== '') {
    const { data } = await callerClient.auth.getUser(jwt);
    if (data.user) {
      const { data: aal } = await callerClient.auth.mfa.getAuthenticatorAssuranceLevel();
      const level = aal?.currentLevel;
      caller = {
        userId: data.user.id,
        assuranceLevel: level === 'aal1' || level === 'aal2' ? level : null,
      };
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const { email, barangayId } = (body ?? {}) as { email?: unknown; barangayId?: unknown };

  const result = await handleInviteKapitan(
    caller,
    { email, barangayId },
    {
      getRole: async (userId) => {
        const { data } = await adminClient
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('role', 'super_admin')
          .maybeSingle();
        return { isSuperAdmin: data !== null };
      },
      getBarangay: async (barangayId) => {
        const { data } = await adminClient
          .from('barangays')
          .select('status')
          .eq('id', barangayId)
          .maybeSingle();
        return data === null ? null : { exists: true, status: data.status };
      },
      createInvitation: async ({ email, barangayId, invitedBy }) => {
        const { data, error } = await adminClient
          .from('role_invitations')
          .insert({
            email,
            role: 'kapitan',
            barangay_id: barangayId,
            invited_by: invitedBy,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .select('id')
          .single();
        if (error || !data) {
          throw new Error(error?.message ?? 'insert failed');
        }
        return { id: data.id as string, tokenReference: data.id as string };
      },
      writeAudit: async ({ actorId, action, entityType, entityId, barangayId, details }) => {
        const { error } = await adminClient.from('audit_events').insert({
          actor_id: actorId,
          actor_role: 'super_admin',
          action,
          entity_type: entityType,
          entity_id: entityId,
          barangay_id: barangayId,
          details,
        });
        if (error) {
          throw new Error(error.message);
        }
      },
    },
  );

  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { 'Content-Type': 'application/json' },
  });
});
