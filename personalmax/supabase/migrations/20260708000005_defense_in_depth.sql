-- Defense-in-depth hardening from the independent security audit.
-- These make the database enforce, on its own, guarantees the app layer
-- already enforces via zod — so a direct PostgREST caller with a valid JWT
-- cannot bypass them. None of these change app behavior for normal use.

-- 1. Reject ASCII control characters at the DB layer (mirrors validation.ts).
--    Single-line fields reject all control chars; note fields still allow
--    tab (\t), newline (\n), carriage return (\r).
alter table public.profiles
  add constraint profiles_display_name_no_ctrl
  check (display_name !~ '[[:cntrl:]]');

alter table public.characters
  add constraint characters_name_no_ctrl
  check (name !~ '[[:cntrl:]]');

alter table public.workout_sessions
  add constraint ws_title_no_ctrl check (title !~ '[[:cntrl:]]'),
  add constraint ws_notes_no_ctrl check (notes !~ E'[\\x00-\\x08\\x0b\\x0c\\x0e-\\x1f\\x7f]');

alter table public.workout_exercises
  add constraint we_name_no_ctrl check (name !~ '[[:cntrl:]]'),
  add constraint we_notes_no_ctrl check (notes !~ E'[\\x00-\\x08\\x0b\\x0c\\x0e-\\x1f\\x7f]');

alter table public.meals
  add constraint meals_name_no_ctrl check (name !~ '[[:cntrl:]]');

-- 2. Sane absolute date bounds (the app enforces a tighter relative window;
--    CHECK constraints must stay immutable so we bound to fixed years).
alter table public.workout_sessions
  add constraint ws_performed_at_range
  check (performed_at >= timestamptz '2000-01-01' and performed_at < timestamptz '2100-01-01');

alter table public.meals
  add constraint meals_eaten_on_range
  check (eaten_on >= date '2000-01-01' and eaten_on < date '2100-01-01');

-- 3. Tighten workout-child RLS so a row can only be attached to a session /
--    exercise the same user owns (not just any row carrying their user_id).
--    Closes the audit's "cross-tenant reference" note at the RLS layer.
drop policy workout_exercises_all on public.workout_exercises;
create policy workout_exercises_all on public.workout_exercises
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.workout_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );

drop policy workout_sets_all on public.workout_sets;
create policy workout_sets_all on public.workout_sets
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.workout_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
    and exists (
      select 1 from public.workout_exercises e
      where e.id = exercise_id and e.user_id = auth.uid()
    )
  );
