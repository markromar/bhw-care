-- BHW Care Realtime authorization (Day 1)
--
-- Clients must join a private channel. This policy lets a signed-in user RECEIVE
-- broadcast messages only on their own topic: 'user:<their user id>'.
-- No send policy is created, so app clients cannot post to any topic. Server code
-- sends messages using the service role.
--
-- Chat and per-conversation topics get their own policies later, and must check
-- conversation membership, barangay and role scope, as the Master Skill requires.

create policy "users can receive broadcasts on their own topic"
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and (select realtime.topic()) = 'user:' || (select auth.uid())::text
  );