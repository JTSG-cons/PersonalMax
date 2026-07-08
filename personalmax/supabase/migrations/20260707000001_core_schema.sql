-- PersonalMax core schema
-- Every table has Row Level Security enabled from the start.
-- Game-state tables (characters, battles, user_awards) are NOT client-writable:
-- they are mutated exclusively by SECURITY DEFINER functions (see functions migration).

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, created by trigger on auth.users
-- ---------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text not null,
  display_name text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  constraint profiles_display_name_len check (char_length(display_name) <= 40)
);
create unique index profiles_username_unique on public.profiles (lower(username));

-- ---------------------------------------------------------------------------
-- characters: one per user; stats/xp/level are server-computed only.
-- Clients may update only the character name (column-level grant below).
-- ---------------------------------------------------------------------------
create table public.characters (
  user_id        uuid primary key references public.profiles (id) on delete cascade,
  name           text not null default 'Adventurer',
  level          int  not null default 1,
  xp             bigint not null default 0,
  strength       int  not null default 1,
  endurance      int  not null default 1,
  discipline     int  not null default 1,
  vitality       int  not null default 1,
  battles_won    int  not null default 0,
  battles_fought int  not null default 0,
  updated_at     timestamptz not null default now(),
  constraint characters_name_len check (char_length(name) between 1 and 30),
  constraint characters_sane check (
    level between 1 and 500 and xp >= 0
    and strength between 1 and 99 and endurance between 1 and 99
    and discipline between 1 and 99 and vitality between 1 and 99
    and battles_won >= 0 and battles_fought >= battles_won
  )
);

-- ---------------------------------------------------------------------------
-- workout tracking
-- ---------------------------------------------------------------------------
create table public.workout_sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  title            text not null,
  notes            text not null default '',
  performed_at     timestamptz not null default now(),
  duration_minutes int,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint ws_title_len check (char_length(title) between 1 and 80),
  constraint ws_notes_len check (char_length(notes) <= 1000),
  constraint ws_duration check (duration_minutes is null or duration_minutes between 0 and 1440)
);
create index workout_sessions_user_idx on public.workout_sessions (user_id, performed_at desc);

create table public.workout_exercises (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  name       text not null,
  position   int  not null default 0,
  notes      text not null default '',
  constraint we_name_len check (char_length(name) between 1 and 80),
  constraint we_notes_len check (char_length(notes) <= 500),
  constraint we_position check (position between 0 and 100)
);
create index workout_exercises_session_idx on public.workout_exercises (session_id, position);
create index workout_exercises_user_idx on public.workout_exercises (user_id);

create table public.workout_sets (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  session_id       uuid not null references public.workout_sessions (id) on delete cascade,
  exercise_id      uuid not null references public.workout_exercises (id) on delete cascade,
  set_number       int  not null default 1,
  reps             int  not null default 0,
  weight_kg        numeric(6, 2) not null default 0,
  duration_seconds int,
  constraint wset_set_number check (set_number between 1 and 100),
  constraint wset_reps check (reps between 0 and 1000),
  constraint wset_weight check (weight_kg >= 0 and weight_kg <= 2000),
  constraint wset_duration check (duration_seconds is null or duration_seconds between 0 and 86400)
);
create index workout_sets_exercise_idx on public.workout_sets (exercise_id, set_number);
create index workout_sets_session_idx on public.workout_sets (session_id);
create index workout_sets_user_idx on public.workout_sets (user_id);

-- ---------------------------------------------------------------------------
-- generated workout plans (deterministic template output, stored as jsonb)
-- ---------------------------------------------------------------------------
create table public.workout_plans (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  goal          text not null,
  experience    text not null,
  days_per_week int  not null,
  split_type    text not null,
  plan          jsonb not null,
  created_at    timestamptz not null default now(),
  constraint wp_goal check (goal in ('strength', 'hypertrophy', 'endurance', 'general')),
  constraint wp_experience check (experience in ('beginner', 'intermediate', 'advanced')),
  constraint wp_days check (days_per_week between 1 and 7),
  constraint wp_split check (split_type in ('full_body', 'upper_lower', 'push_pull_legs', 'bro_split')),
  constraint wp_plan_size check (pg_column_size(plan) <= 65536)
);
create index workout_plans_user_idx on public.workout_plans (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- nutrition targets (deterministic calorie/macro rules output)
-- sex is optional and used ONLY inside the calorie formula; never elsewhere.
-- ---------------------------------------------------------------------------
create table public.nutrition_targets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  bodyweight_kg numeric(5, 1) not null,
  height_cm     numeric(5, 1) not null,
  age           int,
  sex           text,
  goal          text not null,
  calories      int not null,
  protein_g     int not null,
  carbs_g       int not null,
  fat_g         int not null,
  created_at    timestamptz not null default now(),
  constraint nt_bodyweight check (bodyweight_kg between 30 and 400),
  constraint nt_height check (height_cm between 100 and 250),
  constraint nt_age check (age is null or age between 13 and 100),
  constraint nt_sex check (sex is null or sex in ('male', 'female')),
  constraint nt_goal check (goal in ('cut', 'maintain', 'bulk')),
  constraint nt_calories check (calories between 800 and 10000),
  constraint nt_macros check (protein_g between 0 and 1500 and carbs_g between 0 and 2000 and fat_g between 0 and 1000)
);
create index nutrition_targets_user_idx on public.nutrition_targets (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- manual meal logging (no food database by design)
-- ---------------------------------------------------------------------------
create table public.meals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  name       text not null,
  calories   int not null default 0,
  protein_g  int not null default 0,
  carbs_g    int not null default 0,
  fat_g      int not null default 0,
  eaten_on   date not null default current_date,
  created_at timestamptz not null default now(),
  constraint meals_name_len check (char_length(name) between 1 and 120),
  constraint meals_calories check (calories between 0 and 10000),
  constraint meals_macros check (protein_g between 0 and 1000 and carbs_g between 0 and 1000 and fat_g between 0 and 1000)
);
create index meals_user_idx on public.meals (user_id, eaten_on desc);

-- ---------------------------------------------------------------------------
-- friendships: single row per pair; requester sends, addressee accepts/rejects
-- ---------------------------------------------------------------------------
create table public.friendships (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status       text not null default 'pending',
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  constraint friendships_status check (status in ('pending', 'accepted')),
  constraint friendships_not_self check (requester_id <> addressee_id)
);
create unique index friendships_pair_unique on public.friendships (
  least(requester_id, addressee_id), greatest(requester_id, addressee_id)
);
create index friendships_addressee_idx on public.friendships (addressee_id, status);
create index friendships_requester_idx on public.friendships (requester_id, status);

-- ---------------------------------------------------------------------------
-- battles: written exclusively by rpc_resolve_battle (SECURITY DEFINER)
-- ---------------------------------------------------------------------------
create table public.battles (
  id               uuid primary key default gen_random_uuid(),
  challenger_id    uuid not null references public.profiles (id) on delete cascade,
  opponent_id      uuid not null references public.profiles (id) on delete cascade,
  winner_id        uuid not null references public.profiles (id) on delete cascade,
  challenger_score numeric(10, 2) not null,
  opponent_score   numeric(10, 2) not null,
  challenger_roll  numeric(4, 3) not null,
  opponent_roll    numeric(4, 3) not null,
  xp_awarded       int not null default 25,
  created_at       timestamptz not null default now(),
  constraint battles_not_self check (challenger_id <> opponent_id),
  constraint battles_winner check (winner_id in (challenger_id, opponent_id))
);
create index battles_challenger_idx on public.battles (challenger_id, created_at desc);
create index battles_opponent_idx on public.battles (opponent_id, created_at desc);

-- ---------------------------------------------------------------------------
-- awards catalog (seeded) + per-user unlocks (server-evaluated only)
-- ---------------------------------------------------------------------------
create table public.awards (
  key         text primary key,
  name        text not null,
  description text not null,
  xp_bonus    int not null default 0,
  icon        text not null default 'trophy',
  sort        int not null default 0
);

create table public.user_awards (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  award_key   text not null references public.awards (key) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, award_key)
);

-- ---------------------------------------------------------------------------
-- kingdom tiers catalog (level-gated cosmetic progression, seeded)
-- ---------------------------------------------------------------------------
create table public.kingdom_tiers (
  tier        int primary key,
  min_level   int not null unique,
  title       text not null,
  description text not null,
  accent      text not null default '#8b5cf6'
);

-- ---------------------------------------------------------------------------
-- Row Level Security: enabled on EVERY table
-- ---------------------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.characters        enable row level security;
alter table public.workout_sessions  enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_sets      enable row level security;
alter table public.workout_plans     enable row level security;
alter table public.nutrition_targets enable row level security;
alter table public.meals             enable row level security;
alter table public.friendships       enable row level security;
alter table public.battles           enable row level security;
alter table public.awards            enable row level security;
alter table public.user_awards       enable row level security;
alter table public.kingdom_tiers     enable row level security;

-- ---------------------------------------------------------------------------
-- Grants: start from zero for API roles, then grant the minimum.
-- (Supabase grants broad table privileges to anon/authenticated by default.)
-- ---------------------------------------------------------------------------
revoke all on public.profiles,
              public.characters,
              public.workout_sessions,
              public.workout_exercises,
              public.workout_sets,
              public.workout_plans,
              public.nutrition_targets,
              public.meals,
              public.friendships,
              public.battles,
              public.awards,
              public.user_awards,
              public.kingdom_tiers
from anon, authenticated;

-- profiles: read (rows limited by RLS); update own username/display_name only
grant select on public.profiles to authenticated;
grant update (username, display_name) on public.profiles to authenticated;

-- characters: read (rows limited by RLS); update NAME column only.
-- level/xp/stats/battle counters have no client grant at all.
grant select on public.characters to authenticated;
grant update (name) on public.characters to authenticated;

-- user-owned fitness data: full CRUD (rows limited by RLS)
grant select, insert, update, delete on public.workout_sessions  to authenticated;
grant select, insert, update, delete on public.workout_exercises to authenticated;
grant select, insert, update, delete on public.workout_sets      to authenticated;
grant select, insert, delete         on public.workout_plans     to authenticated;
grant select, insert, delete         on public.nutrition_targets to authenticated;
grant select, insert, update, delete on public.meals             to authenticated;

-- friendships: insert request, read own, accept via status column only, delete (reject/remove)
grant select, insert, delete on public.friendships to authenticated;
grant update (status, responded_at) on public.friendships to authenticated;

-- battles / user_awards: read-only for clients; written by SECURITY DEFINER functions
grant select on public.battles to authenticated;
grant select on public.user_awards to authenticated;

-- catalogs: read-only
grant select on public.awards to authenticated;
grant select on public.kingdom_tiers to authenticated;
