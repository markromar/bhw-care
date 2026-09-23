// @ts-nocheck -- Deno Edge Function runtime (Deno.serve, Deno.env, jsr: imports). Not
// checked by our Node/tsc tooling; excluded in tsconfig.json. Deno checks it when it
// bundles and runs the function. Real logic lives in _shared/acceptInvitation.ts and is
// covered by Jest + tsc.
// Deno Edge Function. Deployed with: npx supabase functions deploy accept-invitation
// Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, which Supabase provides
// automatically to every deployed function. Neither is in this repository.
import { createClient } from 'jsr:@supabase/supabase-js@2';

import { handleAcceptInvitation, type CallerInfo } from '../_shared/acceptInvitation.ts';

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

  // Service role client: bypasses RLS. Used for the writes this function is trusted to
  // perform (profile creation, role assignment, closing the invitation).
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  let caller: CallerInfo | null = null;
  if (jwt !== '') {
    const { data } = await callerClient.auth.getUser(jwt);
    if (data.user) {
      caller = { userId: data.user.id };
    }
  }

  const result = await handleAcceptInvitation(caller, {
    findPendingInvitation: async (userId) => {
      const { data, error } = await adminClient
        .from('role_invitations')
        .select('id, role, barangay_id, expires_at')
        .eq('token_reference', userId)
        .eq('status', 'pending')
        .maybeSingle();
      if (error || !data) {
        return null;
      }
      return {
        id: data.id as string,
        role: data.role as string,
        barangayId: data.barangay_id as string,
        expiresAt: data.expires_at as string,
      };
    },
    createProfile: async (userId) => {
      const { error } = await adminClient
        .from('user_profiles')
        .upsert({ id: userId }, { onConflict: 'id', ignoreDuplicates: true });
      if (error) {
        throw new Error(error.message);
      }
    },
    assignRole: async ({ userId, role, barangayId }) => {
      const { error } = await adminClient
        .from('user_roles')
        .insert({ user_id: userId, role, barangay_id: barangayId });
      if (error) {
        throw new Error(error.message);
      }
    },
    markAccepted: async (invitationId, userId) => {
      const { data, error } = await adminClient
        .from('role_invitations')
        .update({ status: 'accepted', accepted_at: new Date().toISOString(), accepted_by: userId })
        .eq('id', invitationId)
        .eq('status', 'pending')
        .select('id');
      return !error && Array.isArray(data) && data.length > 0;
    },
    writeAudit: async ({ actorId, action, entityType, entityId, barangayId, details }) => {
      const { error } = await adminClient.from('audit_events').insert({
        actor_id: actorId,
        actor_role: 'kapitan',
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
  });

  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { 'Content-Type': 'application/json' },
  });
});
