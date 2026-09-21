-- BHW Care push token registration (Day 1)
--
-- Attaches a device push token to the signed-in caller. It exists because a shared
-- phone can hold a token row from a previous user, which row level security hides
-- from the new user. The function always assigns the token to auth.uid(), never to a
-- user id supplied by the client.

create or replace function public.register_push_token(p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'not authenticated';
  end if;

  if p_platform is null or p_platform not in ('ios', 'android') then
    raise exception 'invalid platform';
  end if;

  if p_token is null
     or length(p_token) > 300
     or p_token !~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]{10,200}\]$' then
    raise exception 'invalid token';
  end if;

  insert into public.push_tokens (user_id, expo_push_token, platform)
  values (caller, p_token, p_platform)
  on conflict (expo_push_token) do update
    set user_id = excluded.user_id,
        platform = excluded.platform,
        last_seen_at = now(),
        revoked_at = null;
end;
$$;

revoke all on function public.register_push_token(text, text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;