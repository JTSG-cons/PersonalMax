# PersonalMax security model

## Principles

1. **The database is the authority.** All game state — character stats, XP,
   level, award unlocks, battle outcomes — is computed by `SECURITY DEFINER`
   Postgres functions from real logged history. There is no code path, in the
   browser *or* in the Next.js server, that can write these values directly:
   the API roles simply lack the SQL grants.
2. **No service-role key exists in the app.** The only credentials are the
   project URL and the publishable key, both safe for browsers by design.
   A compromised app server cannot forge game state.
3. **RLS everywhere, from the first migration.** Every table has Row Level
   Security enabled and default-deny policies; users reach their own rows,
   plus friends' profiles/characters where the product requires it.

## Controls by checklist item

| Control | Implementation |
| --- | --- |
| No custom auth | Supabase Auth exclusively (`/api/auth/*` are thin, rate-limited wrappers; sessions via `@supabase/ssr` cookies; refresh in `src/proxy.ts`) |
| RLS on every table | `supabase/migrations/…core_schema.sql` enables RLS on all 13 tables before any data exists; policies in `…functions_policies.sql` |
| Server-side validation | Every mutation route parses its body with zod (`src/lib/validation.ts`); DB CHECK constraints mirror the same bounds |
| No raw SQL from the app | All app queries go through the Supabase client (PostgREST) — no SQL string building anywhere in `src/` |
| Server-computed game state | `compute_progress`, `rpc_resolve_battle` (SECURITY DEFINER); clients hold zero write grants on `characters` (except the `name` column), `battles`, `user_awards` |
| IDOR protection | Route handlers scope every query with `.eq("user_id", user.id)` *and* RLS enforces the same predicate independently; friendship RPCs re-check `auth.uid()` inside SQL |
| Secrets | `.env.example` committed; `.env.local` gitignored; no secret-class values exist |
| Rate limiting | Auth: per-IP sliding window (plus Supabase Auth's own limits). Battles: per-user in-memory window **and** an authoritative in-database count (10/hour) inside `rpc_resolve_battle`. General writes: 120/min/user |
| XSS | React auto-escaping only — `dangerouslySetInnerHTML` is not used; inputs strip control characters and enforce length caps; CSP + `X-Frame-Options: DENY` + `nosniff` headers in `next.config.ts` |
| Dependency hygiene | `npm audit` clean of high/critical findings |

## Notes and trade-offs

- **In-memory rate limiter** is per-instance. That's why the battle limit is
  *also* enforced in Postgres (authoritative), and auth endpoints are further
  protected by Supabase's own service-side limits. If you deploy many
  instances and want strict global limits on general writes too, add a
  Postgres- or Redis-backed counter.
- **CSP allows `'unsafe-inline'` scripts** because Next.js injects inline
  bootstrap scripts; tightening to nonces is possible with a custom proxy
  step if required.
- **`is_friend`/`is_connected`** are SECURITY DEFINER helpers used by RLS
  policies. They only answer questions where the caller is one of the two
  parties, so relationships between other users cannot be probed.
- **Username lookup** (`rpc_lookup_profile`) is exact-match only and returns
  id/username/display name — needed to send a friend request; no search or
  enumeration surface.
- **Biological sex** (optional) is stored on the nutrition target row the user
  created, is used only inside the calorie formula, and is visible only to its
  owner (owner-only RLS on `nutrition_targets`).
