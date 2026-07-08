-- PersonalMax seed data: award catalog + kingdom tier catalog.
-- Ship-set only (extensible by adding rows + a condition branch in compute_progress).

insert into public.awards (key, name, description, xp_bonus, icon, sort) values
  ('first_workout',    'First Blood',  'Log your first workout session.',            50,  'dumbbell', 1),
  ('week_streak',      'Iron Week',    'Log a workout or meal 7 days in a row.',     150, 'flame',    2),
  ('first_meal',       'Fuel Up',      'Log your first meal.',                       25,  'utensils', 3),
  ('first_battle_win', 'Gladiator',    'Win your first battle.',                     75,  'swords',   4),
  ('squad_five',       'Squad Goals',  'Build a crew of 5 friends.',                 100, 'users',    5);

insert into public.kingdom_tiers (tier, min_level, title, description, accent) values
  (1, 1,  'Campsite',   'A lone tent under the stars. Every empire starts somewhere.',      '#78716c'),
  (2, 5,  'Hamlet',     'A few huts and a training yard. Word of your discipline spreads.', '#a3e635'),
  (3, 10, 'Village',    'A palisade, a forge, and your first loyal followers.',             '#34d399'),
  (4, 18, 'Town',       'Stone walls rise. Merchants arrive, drawn by your renown.',        '#22d3ee'),
  (5, 28, 'City',       'Banners fly from the gatehouse. Your name carries weight.',        '#60a5fa'),
  (6, 40, 'Stronghold', 'A fortress of iron and granite. Rivals think twice.',              '#a78bfa'),
  (7, 55, 'Kingdom',    'A crown, a court, and lands as far as the eye can see.',           '#f472b6'),
  (8, 75, 'Empire',     'Your legend spans the known world. The grind built this.',         '#fbbf24');
