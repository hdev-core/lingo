# LINGO — Database Infra Setup (Supabase Postgres)

This covers the infra requirements: provisioning Postgres, migrating the 8
core tables (+ the curated word bank), seeding words, and locking down
`answer`/`secret`.

**Workflow used for this project:** migrations and seeds are run manually
through the Supabase SQL Editor (dashboard → SQL Editor → paste → Run), in
file order.
The `.js` seed script is the one exception; it still runs from your terminal
since it needs to fetch a word list over HTTP first.

## 1. Provision Postgres (Supabase, free tier)

1. Create a free Supabase account, create a new project.
2. Grab two connection strings from **Project Settings → Database →
   Connection string**:
   - **Transaction pooler** (port `6543`) → this is your `DATABASE_URL`,
     used by the running Express app.
   - **Session pooler** (port `5432`, via the `pooler.supabase.com` host —
     *not* `db.<ref>.supabase.co`, which is IPv6-only and unreachable from
     most home networks) → this is your `DIRECT_URL`, used by the seed
     script.
3. Both use the username format `postgres.<project-ref>` on the pooler —
   copy it exactly as Supabase displays it.
4. Use a password with letters/numbers only (no `:`, `@`, `/`, `%`) to avoid
   URL-parsing issues in the connection string.

## 2. Wire it via env

`server/.env` (never commit this file):

```
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
```

- The Express app connects using `DATABASE_URL`.
- The word-list seed script connects using `DIRECT_URL`.
- Per the tech doc's environments note: create **separate** Supabase
  projects (and separate `.env` files) for development vs production, so
  testing reward-rule changes never touches real data.

Example `pg` client in the backend:

```js
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
```

## 3. Run the migrations (8 core tables + words), via SQL Editor

Files live in `server/migrations/`, numbered so they apply in the right
order — foreign keys depend on earlier tables existing first. **Open each
file, copy its contents into Supabase's SQL Editor, and run them in this
exact order:**

| File | What it does |
|---|---|
| `001_extensions_and_users.sql` | creates `users` |
| `002_words.sql` | creates `words` (curated word bank — not one of the 8, but `daily_puzzles` depends on it) |
| `003_daily_puzzles.sql` | creates `daily_puzzles` |
| `004_guesses.sql` | creates `guesses` |
| `005_solves.sql` | creates `solves` |
| `006_streaks.sql` | creates `streaks` |
| `007_weekly_pools.sql` | creates `weekly_pools` |
| `008_payouts.sql` | creates `payouts` |
| `009_tokens.sql` | creates `tokens` |
| `010_security_lockdown.sql` | locks down `answer`/`secret`/`word_id` (see §5) |
| `011_backend_grants.sql` | confirms/ensures the backend's own DB role can still read `answer`/`secret`/`word_id` after `010`'s lockdown |
| `012_dedupe_streaks.sql` | drops the duplicate `current_streak`/`longest_streak` columns from `users` — `streaks` is the single source of truth (see §6) |

Before running each file, sanity-check the filename in `server/migrations/`
actually starts with the number shown above — if any file lost its prefix
during a save/rename, fix that first (rename it to match), since the order
you paste things into the SQL Editor matters just as much as filenames
would for an automated runner.

**Schema notes vs. the data model doc:**
- All foreign keys (`hive_username`, `puzzle_date`, `week_start_date`) are
  enforced at the DB level, not just assumed in application code.
- `guesses` has a `UNIQUE (hive_username, puzzle_date, attempt_number)`
  constraint — this is the DB-level backstop for the one-attempt-per-account
  rule described in the anti-cheat section.
- `solves`, `payouts`, and `tokens` each have a `UNIQUE (hive_username, <date>)`
  constraint for the same reason (one qualifying solve/payout/issuance per
  account per day or week).
- `daily_puzzles.word_id` links back to `words`, so you can trace which pool
  entry a given day's answer came from.

All files use `IF EXISTS` / `IF NOT EXISTS` guards, so re-running any of
them in the SQL Editor is safe and won't error or duplicate anything.

## 4. Seed the curated word database

Two seed files in `server/seed/`:

- **`seed_hive_terms.sql`** — the Hive/Web3 vocabulary already named in the
  Product Spec's theme lists (DeFi week, NFT week terms). Paste directly
  into the SQL Editor and run.

- **`seed_wordle_list.js`** — pulls a small open-source, MIT-licensed list
  of valid 5-letter English words (not NYT's proprietary answer list — a
  community-maintained word list) and inserts them tagged
  `category:'general'`, `theme:'general'`, with a rough difficulty guess.
  This one still runs from your terminal (it needs to fetch the list over
  HTTP, which the SQL Editor can't do):

  ```bash
  cd server
  node --env-file=.env seed/seed_wordle_list.js
  ```

  The difficulty heuristic in that script is a placeholder — swap it out
  once the Puzzle Curator defines real difficulty tiers, or re-tag rows
  directly in the `words` table afterward. Both seed scripts are safe to
  re-run (`ON CONFLICT (word) DO NOTHING`).

Every column the doc asked for is covered: `difficulty`, `category`, `theme`,
`length` (validated against the actual word via a CHECK constraint), plus
`is_active` so you can retire a word after it's used, and `used_count` /
`last_used_on` so the daily-puzzle picker can avoid repeats.

## 5. Answer/secret: server-only, never exposed to the frontend

Enforced in two layers — `010_security_lockdown.sql` restricts access,
`011_backend_grants.sql` confirms your own backend isn't accidentally
locked out by that restriction:

1. **A safe view, `daily_puzzles_public`**, exposes every column except
   `word_id`, `answer`, and `secret`. Point every frontend-reachable
   endpoint (`GET /api/puzzle/today`, `GET /api/verify/:date`, etc.) at this
   view, not the raw `daily_puzzles` table.
2. **Column-level `REVOKE`/`GRANT`** on the base table itself, so
   `SELECT *` or `SELECT answer` fails for `PUBLIC` and for Supabase's
   built-in `anon`/`authenticated` roles — the exact roles PostgREST would
   use if the frontend ever queried Supabase directly with the anon key.
3. **`011_backend_grants.sql`** documents/confirms that your backend's own
   connection role is exempt from that lockdown. In almost all cases this
   is automatic: your backend connects as the table *owner*
   (`postgres.<project-ref>`), and owners always retain full privileges
   regardless of `REVOKE ... FROM PUBLIC`. Confirm this any time with:

   ```sql
   SELECT tableowner FROM pg_tables WHERE tablename = 'daily_puzzles';
   SELECT current_user;
   ```

   If those two match, you're covered. The migration also pre-grants access
   to Supabase's `service_role`, in case a future contributor switches the
   backend to use it instead.

**The application-code rule that matters most, though:** never write
`SELECT * FROM daily_puzzles` anywhere the result could reach an HTTP
response. Always select explicit columns, or query the `_public` view. The
DB-level lockdown is a backstop for mistakes, not a substitute for that
discipline — your backend's own DB connection legitimately *does* need to
read `answer` to validate guesses (Phase 2 of the roadmap), so it can't be
blocked from the table entirely, only from ever forwarding those columns
into a response.

## 6. Streak data: `streaks` is the single source of truth

`current_streak` and `longest_streak` originally existed in both `users`
and `streaks`. `012_dedupe_streaks.sql` drops those two columns from
`users` to remove any chance of them drifting out of sync. Going forward:

- `users` holds identity + lifetime reward totals only:
  `hive_username`, `consecutive_qualifying_weeks`, `total_lingo_earned`.
- `streaks` holds all streak state: `hive_username`, `current_streak`,
  `longest_streak`, `last_solved_date`.

**Before running `012` against a database with real backend code already
pointed at `users.current_streak` / `users.longest_streak`,** update those
queries to read from `streaks` instead — otherwise they'll start failing
with "column does not exist" the moment this migration runs.