# PersonalMax

A production-ready, installable PWA for gym rats of any gender: log workouts,
generate a training plan for your split, follow a calorie/macro target, and
level an RPG character — with kingdom tiers, awards, a friends leaderboard,
and asynchronous stat battles. Every point of XP is earned from **real logged
training and nutrition** and computed **inside the database**, so it can't be
faked.

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack) + **Tailwind CSS v4**
- **Supabase**: Postgres + Auth + Row Level Security (no other auth, ever)
- **zod** for server-side input validation; **vitest** for the engine test suite

## Architecture in one paragraph

User-owned fitness data (sessions, exercises, sets, meals, plans, targets) is
written through Next.js route handlers that validate with zod and then use the
caller's **RLS-scoped** Supabase client — the database enforces ownership on
every row. Game state (character stats, XP, level, award unlocks, battle
outcomes) is **never writable by any client**: it lives behind column-level
grants and is recomputed exclusively by `SECURITY DEFINER` Postgres functions
(`compute_progress`, `rpc_resolve_battle`) from logged history. The app holds
no service-role secret at all — see `SECURITY.md`. Formula spec:
`docs/FORMULAS.md`; deterministic TS mirrors + generators: `src/lib/engine/`.

## Getting started

```bash
npm install

# 1. Create a Supabase project, then apply the SQL in supabase/migrations/
#    in filename order (SQL editor or `supabase db push`).

# 2. Configure env (publishable values only):
cp .env.example .env.local   # fill in URL + publishable key

# 3. Run
npm run dev
```

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | dev server |
| `npm run build` / `npm start` | production build / serve |
| `npm test` | vitest suite for all deterministic engines |
| `npm run typecheck` | strict TypeScript check |
| `npm run lint` | ESLint |
| `node scripts/generate-icons.mjs` | regenerate PWA icons (no deps) |

## Feature map

| Area | Routes | Notes |
| --- | --- | --- |
| Auth | `/login`, `/signup`, `/api/auth/*` | Supabase Auth only; rate-limited |
| Workouts | `/workouts`, `/workouts/new`, `/workouts/[id]` | full CRUD, history |
| Plan generator | `/plan` | deterministic templates: goal × experience × days × split |
| Nutrition | `/nutrition` | BMR-based target (optional sex → neutral average), manual meal log |
| Character | `/character` | server-computed stats/XP/level; rename only |
| Kingdom | `/kingdom` | level-gated cosmetic tiers |
| Awards | `/awards` | 5 seed awards, server-evaluated, XP bonuses |
| Social | `/friends`, `/leaderboard`, `/battles` | requests, friends-only ranking, async battles |

## PWA

`src/app/manifest.ts` + `public/sw.js` (registered in production builds).
Installable on mobile and desktop; static assets cached, navigations fall back
to cache offline. API/Supabase traffic is never intercepted. Icon PNGs are
generated into `public/icons/` by the dependency-free script at install time
(`postinstall`), so no binaries live in the repo.

## Deploying to Vercel

The app lives in this `personalmax/` subdirectory, so when importing the repo:

1. **Root Directory** must be set to `personalmax` (Vercel → Settings → Build
   and Deployment). With it unset, Vercel builds the repo root — which has no
   `package.json` — and every route returns a platform `404 NOT_FOUND`.
2. Add the two build-time environment variables (both are public/browser-safe;
   Row Level Security is the real boundary):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. Redeploy after changing either of the above — settings changes do not
   rebuild on their own.
4. In Supabase → Authentication → URL Configuration, set the Site URL and add
   the deployed origin to the redirect allowlist so auth emails link correctly.
