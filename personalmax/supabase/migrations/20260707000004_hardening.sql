-- Hardening pass from Supabase security advisors:
-- 1. Pin search_path on remaining functions.
-- 2. is_friend / is_connected only answer questions involving the caller,
--    so a signed-in user cannot probe relationships between other users.
-- 3. Unexpose XP math helpers from the client API (UI uses the TS mirror).

alter function public.set_updated_at() set search_path = public;
alter function public.xp_for_level(int) set search_path = public;
alter function public.level_from_xp(bigint) set search_path = public;

create or replace function public.is_friend(a uuid, b uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select (a = auth.uid() or b = auth.uid())
     and exists (
       select 1 from friendships f
       where f.status = 'accepted'
         and ((f.requester_id = a and f.addressee_id = b)
           or (f.requester_id = b and f.addressee_id = a))
     );
$$;

create or replace function public.is_connected(a uuid, b uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select (a = auth.uid() or b = auth.uid())
     and exists (
       select 1 from friendships f
       where (f.requester_id = a and f.addressee_id = b)
          or (f.requester_id = b and f.addressee_id = a)
     );
$$;

revoke execute on function public.xp_for_level(int) from authenticated;
revoke execute on function public.level_from_xp(bigint) from authenticated;
