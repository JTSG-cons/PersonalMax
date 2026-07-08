-- PersonalMax functions, triggers, and RLS policies.
--
-- All game-state mutations (character stats/XP/level, award unlocks, battle
-- outcomes) happen ONLY inside SECURITY DEFINER functions in this file.
-- Formulas are documented in docs/FORMULAS.md and mirrored by unit-tested
-- TypeScript in src/lib/engine/.

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_friend(a uuid, b uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
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
  select exists (
    select 1 from friendships f
    where (f.requester_id = a and f.addressee_id = b)
       or (f.requester_id = b and f.addressee_id = a)
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger workout_sessions_updated_at
  before update on public.workout_sessions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- leveling curve: cumulative XP required to reach level n is
--   xp_for_level(n) = floor(100 * (n - 1) ^ 1.5)
-- ---------------------------------------------------------------------------
create or replace function public.xp_for_level(n int)
returns bigint
language sql immutable
as $$
  select case when n <= 1 then 0 else floor(100 * power(n - 1, 1.5))::bigint end;
$$;

create or replace function public.level_from_xp(p_xp bigint)
returns int
language plpgsql immutable
as $$
declare
  v int;
begin
  v := greatest(1, floor(power(greatest(p_xp, 0) / 100.0, 2.0 / 3.0))::int + 1);
  while public.xp_for_level(v + 1) <= p_xp loop
    v := v + 1;
  end loop;
  while v > 1 and public.xp_for_level(v) > p_xp loop
    v := v - 1;
  end loop;
  return least(v, 500);
end;
$$;

-- ---------------------------------------------------------------------------
-- compute_progress: the single authority for stats, XP, level, award unlocks.
-- Deterministic and idempotent: recomputes everything from real logged history.
-- ---------------------------------------------------------------------------
create or replace function public.compute_progress(p_user uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_vol numeric := 0;
  v_reps bigint := 0;
  v_sessions int := 0;
  v_dur numeric := 0;
  v_active_days int := 0;
  v_streak int := 0;
  v_meals int := 0;
  v_meal_days int := 0;
  v_adherent int := 0;
  v_wins int := 0;
  v_fought int := 0;
  v_friends int := 0;
  v_target int;
  v_str int;
  v_end int;
  v_dis int;
  v_vit int;
  v_workout_xp bigint := 0;
  v_meal_xp bigint := 0;
  v_award_xp bigint := 0;
  v_xp bigint := 0;
begin
  -- workout aggregates
  select coalesce(sum(s.reps * s.weight_kg), 0), coalesce(sum(s.reps), 0)
    into v_vol, v_reps
    from workout_sets s
   where s.user_id = p_user;

  select count(*),
         coalesce(sum(coalesce(duration_minutes, 0)), 0),
         count(distinct (performed_at at time zone 'UTC')::date)
    into v_sessions, v_dur, v_active_days
    from workout_sessions
   where user_id = p_user;

  -- workout XP: per session, 50 base + floor(session volume / 100) capped at 50
  select coalesce(sum(50 + least(floor(sv.vol / 100), 50)), 0)::bigint
    into v_workout_xp
    from (
      select ws.id, coalesce(sum(s.reps * s.weight_kg), 0) as vol
        from workout_sessions ws
        left join workout_sets s on s.session_id = ws.id
       where ws.user_id = p_user
       group by ws.id
    ) sv;

  -- meal aggregates + XP: 10 XP per meal, at most 3 meals per day count
  select count(*), count(distinct eaten_on)
    into v_meals, v_meal_days
    from meals
   where user_id = p_user;

  select coalesce(sum(least(mc.c, 3)) * 10, 0)::bigint
    into v_meal_xp
    from (select eaten_on, count(*) as c from meals where user_id = p_user group by eaten_on) mc;

  -- days adhering to the latest calorie target (within +/- 10%)
  select calories into v_target
    from nutrition_targets
   where user_id = p_user
   order by created_at desc
   limit 1;

  if v_target is not null then
    select count(*)
      into v_adherent
      from (select eaten_on, sum(calories) as cal from meals where user_id = p_user group by eaten_on) d
     where abs(d.cal - v_target) <= 0.10 * v_target;
  end if;

  -- longest consecutive-day logging streak (workout or meal days)
  select coalesce(max(runs.cnt), 0)
    into v_streak
    from (
      select count(*) as cnt
        from (
          select d, d - (row_number() over (order by d))::int as grp
            from (
              select distinct (performed_at at time zone 'UTC')::date as d
                from workout_sessions where user_id = p_user
              union
              select distinct eaten_on from meals where user_id = p_user
            ) days
        ) g
       group by grp
    ) runs;

  -- battles
  select count(*) filter (where winner_id = p_user), count(*)
    into v_wins, v_fought
    from battles
   where challenger_id = p_user or opponent_id = p_user;

  -- accepted friends
  select count(*)
    into v_friends
    from friendships
   where status = 'accepted' and (requester_id = p_user or addressee_id = p_user);

  -- stats (1..99). See docs/FORMULAS.md.
  v_str := least(99, greatest(1, 1 + floor(20 * log(10, (1 + v_vol / 1000.0)))::int));
  v_end := least(99, greatest(1, 1
            + floor(15 * log(10, (1 + v_dur / 60.0)))::int
            + floor(10 * log(10, (1 + v_reps / 500.0)))::int));
  v_dis := least(99, greatest(1, 1
            + floor(2 * sqrt(v_active_days + v_meal_days))::int
            + least(v_streak, 30)));
  v_vit := least(99, greatest(1, 1
            + floor(3 * sqrt(v_meal_days))::int
            + floor(4 * sqrt(v_adherent))::int));

  -- server-evaluated award unlocks (conditions depend only on counters above)
  insert into user_awards (user_id, award_key)
  select p_user, a.key
    from awards a
   where not exists (
           select 1 from user_awards ua
            where ua.user_id = p_user and ua.award_key = a.key
         )
     and (
           (a.key = 'first_workout'    and v_sessions >= 1) or
           (a.key = 'week_streak'      and v_streak >= 7) or
           (a.key = 'first_meal'       and v_meals >= 1) or
           (a.key = 'first_battle_win' and v_wins >= 1) or
           (a.key = 'squad_five'       and v_friends >= 5)
         );

  select coalesce(sum(a.xp_bonus), 0)::bigint
    into v_award_xp
    from user_awards ua
    join awards a on a.key = ua.award_key
   where ua.user_id = p_user;

  v_xp := v_workout_xp + v_meal_xp + (25::bigint * v_wins) + v_award_xp;

  insert into characters as c
    (user_id, level, xp, strength, endurance, discipline, vitality, battles_won, battles_fought, updated_at)
  values
    (p_user, public.level_from_xp(v_xp), v_xp, v_str, v_end, v_dis, v_vit, v_wins, v_fought, now())
  on conflict (user_id) do update
    set level = excluded.level,
        xp = excluded.xp,
        strength = excluded.strength,
        endurance = excluded.endurance,
        discipline = excluded.discipline,
        vitality = excluded.vitality,
        battles_won = excluded.battles_won,
        battles_fought = excluded.battles_fought,
        updated_at = now();
end;
$$;

-- ---------------------------------------------------------------------------
-- public RPC: recompute the calling user's own progress
-- ---------------------------------------------------------------------------
create or replace function public.rpc_recompute_my_progress()
returns setof public.characters
language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  perform public.compute_progress(v_user);
  return query select * from characters where user_id = v_user;
end;
$$;

-- ---------------------------------------------------------------------------
-- public RPC: resolve an asynchronous battle, server-authoritative.
--   power = (0.35*STR + 0.25*END + 0.20*DIS + 0.20*VIT) * (1 + 0.02*level)
--   score = power * roll, roll uniform in [0.85, 1.15]; defender wins ties.
-- Rate limited: max 10 challenges per hour per user (DB-enforced).
-- ---------------------------------------------------------------------------
create or replace function public.rpc_resolve_battle(p_opponent uuid)
returns setof public.battles
language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_recent int;
  c_char characters%rowtype;
  o_char characters%rowtype;
  v_c_roll numeric(4, 3);
  v_o_roll numeric(4, 3);
  v_c_score numeric(10, 2);
  v_o_score numeric(10, 2);
  v_winner uuid;
  v_battle_id uuid;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  if p_opponent is null or p_opponent = v_user then
    raise exception 'invalid_opponent';
  end if;
  if not public.is_friend(v_user, p_opponent) then
    raise exception 'not_friends';
  end if;

  select count(*) into v_recent
    from battles
   where challenger_id = v_user and created_at > now() - interval '1 hour';
  if v_recent >= 10 then
    raise exception 'rate_limited';
  end if;

  perform public.compute_progress(v_user);
  perform public.compute_progress(p_opponent);

  select * into c_char from characters where user_id = v_user;
  select * into o_char from characters where user_id = p_opponent;
  if c_char.user_id is null or o_char.user_id is null then
    raise exception 'character_missing';
  end if;

  v_c_roll := round((0.85 + random() * 0.30)::numeric, 3);
  v_o_roll := round((0.85 + random() * 0.30)::numeric, 3);

  v_c_score := round(((0.35 * c_char.strength + 0.25 * c_char.endurance
                     + 0.20 * c_char.discipline + 0.20 * c_char.vitality)
                     * (1 + 0.02 * c_char.level) * v_c_roll)::numeric, 2);
  v_o_score := round(((0.35 * o_char.strength + 0.25 * o_char.endurance
                     + 0.20 * o_char.discipline + 0.20 * o_char.vitality)
                     * (1 + 0.02 * o_char.level) * v_o_roll)::numeric, 2);

  if v_c_score > v_o_score then
    v_winner := v_user;
  else
    v_winner := p_opponent;
  end if;

  insert into battles
    (challenger_id, opponent_id, winner_id, challenger_score, opponent_score,
     challenger_roll, opponent_roll, xp_awarded)
  values
    (v_user, p_opponent, v_winner, v_c_score, v_o_score, v_c_roll, v_o_roll, 25)
  returning id into v_battle_id;

  perform public.compute_progress(v_user);
  perform public.compute_progress(p_opponent);

  return query select * from battles where id = v_battle_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- public RPC: exact-username lookup for sending friend requests.
-- Returns at most one row of non-sensitive columns; no enumeration/search.
-- ---------------------------------------------------------------------------
create or replace function public.rpc_lookup_profile(p_username text)
returns table (id uuid, username text, display_name text)
language sql stable security definer set search_path = public
as $$
  select p.id, p.username, p.display_name
    from profiles p
   where lower(p.username) = lower(trim(p_username))
   limit 1;
$$;

-- ---------------------------------------------------------------------------
-- signup trigger: create profile + character for every new auth user
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_base text;
  v_username text;
  v_display text;
  i int := 0;
begin
  v_base := coalesce(
    nullif(regexp_replace(coalesce(new.raw_user_meta_data ->> 'username', ''), '[^A-Za-z0-9_]', '', 'g'), ''),
    'max' || substr(replace(new.id::text, '-', ''), 1, 8)
  );
  v_base := substr(v_base, 1, 20);
  if char_length(v_base) < 3 then
    v_base := rpad(v_base, 3, '0');
  end if;

  v_display := substr(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), v_base), 1, 40);
  v_username := v_base;

  loop
    begin
      insert into public.profiles (id, username, display_name)
      values (new.id, v_username, v_display);
      exit;
    exception when unique_violation then
      i := i + 1;
      if i > 5 then
        raise;
      end if;
      v_username := substr(v_base, 1, 14) || '_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 4);
    end;
  end loop;

  insert into public.characters (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- function execute grants: internal functions are NOT callable by clients
-- ---------------------------------------------------------------------------
revoke execute on function public.compute_progress(uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

revoke execute on function public.is_friend(uuid, uuid) from public, anon;
revoke execute on function public.is_connected(uuid, uuid) from public, anon;
revoke execute on function public.xp_for_level(int) from public, anon;
revoke execute on function public.level_from_xp(bigint) from public, anon;
revoke execute on function public.rpc_recompute_my_progress() from public, anon;
revoke execute on function public.rpc_resolve_battle(uuid) from public, anon;
revoke execute on function public.rpc_lookup_profile(text) from public, anon;

grant execute on function public.is_friend(uuid, uuid) to authenticated;
grant execute on function public.is_connected(uuid, uuid) to authenticated;
grant execute on function public.xp_for_level(int) to authenticated;
grant execute on function public.level_from_xp(bigint) to authenticated;
grant execute on function public.rpc_recompute_my_progress() to authenticated;
grant execute on function public.rpc_resolve_battle(uuid) to authenticated;
grant execute on function public.rpc_lookup_profile(text) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS policies (tables already have RLS enabled; default deny)
-- ---------------------------------------------------------------------------

-- profiles: self + anyone connected by a friendship row (pending or accepted),
-- so incoming/outgoing requests and friends can render names.
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_connected(auth.uid(), id));

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- characters: self + accepted friends (leaderboard/battles); name-only updates
create policy characters_select on public.characters
  for select to authenticated
  using (user_id = auth.uid() or public.is_friend(auth.uid(), user_id));

create policy characters_update on public.characters
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- user-owned fitness data: owner only
create policy workout_sessions_all on public.workout_sessions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy workout_exercises_all on public.workout_exercises
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy workout_sets_all on public.workout_sets
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy workout_plans_all on public.workout_plans
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy nutrition_targets_all on public.nutrition_targets
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy meals_all on public.meals
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- friendships
create policy friendships_select on public.friendships
  for select to authenticated
  using (auth.uid() in (requester_id, addressee_id));

create policy friendships_insert on public.friendships
  for insert to authenticated
  with check (requester_id = auth.uid() and status = 'pending');

create policy friendships_update on public.friendships
  for update to authenticated
  using (addressee_id = auth.uid() and status = 'pending')
  with check (addressee_id = auth.uid() and status = 'accepted');

create policy friendships_delete on public.friendships
  for delete to authenticated
  using (auth.uid() in (requester_id, addressee_id));

-- battles: participants read; nobody writes (SECURITY DEFINER only)
create policy battles_select on public.battles
  for select to authenticated
  using (auth.uid() in (challenger_id, opponent_id));

-- user_awards: owner reads; nobody writes (SECURITY DEFINER only)
create policy user_awards_select on public.user_awards
  for select to authenticated
  using (user_id = auth.uid());

-- catalogs: any authenticated user can read
create policy awards_select on public.awards
  for select to authenticated
  using (true);

create policy kingdom_tiers_select on public.kingdom_tiers
  for select to authenticated
  using (true);
