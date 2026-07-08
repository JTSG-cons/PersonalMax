# PersonalMax independent security audit

Audited by an independent multi-agent workflow (12 auditors, one per checklist
dimension, none of which wrote the code), cross-checked against the live
Supabase database (`riwoyoihkmgeyuurvfmw`) via read-only queries. This document
records the result and the fixes applied afterward.

## Checklist verdict

| # | Item | Verdict |
| --- | --- | --- |
| 1 | No custom password/session handling — Supabase Auth only | ✅ Pass |
| 2 | RLS on every table; own-data or friend-shared only | ✅ Pass (RLS on all 13 tables; child-ownership tightened, see fixes) |
| 3 | All inputs validated server-side with zod | ✅ Pass (date bounds + page validation added, see fixes) |
| 4 | All queries via Supabase client — no raw SQL | ✅ Pass |
| 5 | Stats / unlocks / battle outcomes 100% server-computed | ✅ Pass |
| 6 | Every route authorizes the resource — no IDOR | ✅ Pass |
| 7 | Secrets only in env; `.env.example` committed, no real `.env` | ✅ Pass |
| 8 | Rate limiting on auth and battle endpoints | ✅ Pass (per-account auth limit added, see fixes) |
| 9 | User text escaped before render — no stored XSS | ✅ Pass (control-char CHECKs added at DB layer) |
| 10 | `npm audit` clean of high/critical | ✅ Pass (2 moderate in Next's bundled postcss; 0 high/critical) |

No high- or critical-severity issues were found. All findings were low or
medium severity and have been remediated or accepted with rationale.

## Fixes applied after the audit

1. **Auth brute-force via spoofed `X-Forwarded-For` (medium).** The per-IP auth
   limiter keyed on a client-controllable header. Added a **per-account** limit
   (keyed on the target email) so a single account cannot be brute-forced by
   rotating the IP header. Verified live: 6 attempts allowed, 7th returns 429
   even with a different spoofed IP on every request. `clientIp` now prefers
   `x-real-ip`. (`src/lib/rate-limit.ts`, `src/lib/api.ts`, auth routes.)
2. **Unbounded log dates (low).** `performedAt` / `eatenOn` had format-only
   validation and feed the server-side streak/XP recompute. Added a relative
   window in zod (2000 → tomorrow) plus immutable absolute CHECK constraints in
   the database. (`src/lib/validation.ts`, migration `…000005`.)
3. **Workout-child cross-tenant reference (low).** RLS on `workout_exercises` /
   `workout_sets` checked `user_id` but not that the referenced session/exercise
   belonged to the caller. Tightened the `WITH CHECK` with ownership subqueries.
   Verified live: user B can no longer attach a row to user A's session.
   (migration `…000005`.)
4. **Control characters only filtered at the app layer (low).** Added DB CHECK
   constraints rejecting control characters on all user-text columns, so a
   direct PostgREST caller with a valid JWT cannot store them either. (migration
   `…000005`.) Not an XSS vector (React escapes all render sites) — hardening.
5. **Unvalidated page params (low).** The workout edit page now validates its
   `[id]` as a UUID (404 on malformed); the leaderboard `?page=` now goes
   through the shared `paginationSchema` (validated + clamped 0–10000).

## Accepted with rationale (not fixed)

- **CSP `script-src 'unsafe-inline'`** — required by Next.js's inline bootstrap
  scripts. Primary XSS defense is React escaping; CSP is a secondary layer.
  Tightening to nonces is possible via a custom proxy step if desired.
- **`npm audit` 2 moderate** — both are the postcss advisory inside Next.js's
  own dependency tree; no high/critical, which meets the checklist bar. Fixing
  requires a Next.js downgrade (breaking).
- **Supabase auth cookies `httpOnly: false`** — the `@supabase/ssr` default (the
  browser SDK reads the access token). Mitigated by SameSite=Lax + the app's CSP
  (no XSS path to read them) and short-lived tokens.
