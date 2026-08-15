# LINGO — Deployment & Infrastructure Guide

Infra reference for lingo (Wordle-style word game, React + Vite frontend +
Node/Express backend). Start here for "where does my code run" and "why
can't I deploy X."

**Update note:** this doc previously described LINGO as frontend +
Supabase only, with no backend to host. That's no longer accurate — there
is now an always-on Node server (`server/`) on a dedicated, provisioned
Hetzner box. Several other details below were also corrected to match
what's actually built (see notes marked **[corrected]**).

## Your team & who owns which infra piece

- **Laura Malaeb** — PostgreSQL schema & migrations on Supabase (§3b) +
  RLS security lockdown; Node/Express backend (`server/`) including WAX
  signing, HAF reads, Hive-Engine reads, and its Hetzner deployment (§3c).
- **Intissar Soulaiman** — frontend / UI foundation (Wordle grid, app
  shell) + project scaffold; Vercel deployment (§3a).

## 1. Your stack

| Layer | What you use | Where it runs |
|---|---|---|
| Frontend | React + Vite (`web`) | Vercel (root dir `web`) |
| Backend server | Node + Express (`server`) | **Hetzner VPS** — see §3c |
| Database | Postgres, raw SQL migrations | Supabase |
| Auth | Hive Keychain (via Aioha), challenge-response + JWT | Hive-native, not Supabase Auth |
| Hive network | **Mainnet** — see §3c | real transactions, dedicated app account |

**[corrected]** Three things in earlier drafts of this doc were
inaccurate:
- **No Prisma.** Hand-written SQL migrations run through Supabase's SQL
  Editor, queried via `pg` directly — no ORM.
- **No Supabase Edge Functions.** Guess validation and the commit/reveal
  cycle run in the Express app on the Hetzner box (§3c). Supabase is
  database hosting only.
- Custodial "Continue with Google" auth is a **Phase-2 backlog item**, not
  built — v1 auth is Keychain-only.

## 2. "I can't deploy / connect X" — how access works

Connecting Supabase / Vercel to a repo in the hdev-core org needs an org
owner (Dr. Mohammad) to authorize that service's GitHub app. To request:
comment on your DevOps card naming the service + that it's scoped to
lingo only.

**Hetzner access:** provisioned directly by Dr. Mohammad via DM (root SSH
credentials), not through a GitHub-app flow, since it's a dedicated box
rather than a connected service. Credentials are shared privately and
never posted in the repo or any issue/PR.

## 3a. Frontend → Vercel

*(unchanged — see HOSTING_GUIDE.md for `deploy.yml`/`preview.yml`)*

## 3b. Database → Supabase (Laura)

Two connection strings:
- `DATABASE_URL` — pooled, port 6543 (runtime).
- `DIRECT_URL` — direct, port 5432 (migrations/seed scripts only).

Both live in `server/.env` — never committed. **[corrected]** No
`schema.prisma` — migrations are numbered `.sql` files under
`server/migrations/`, run manually through Supabase's SQL Editor.

**Answer/secret security:** `daily_puzzles.answer`/`secret` are revoked
from `PUBLIC` and Supabase's `anon`/`authenticated` roles at the DB level.
**[corrected]** Guess validation runs in a private Express endpoint
(`POST /api/guess`), not a Supabase Edge Function. `GET /api/verify/:date`
checks a revealed day's answer against the actual **on-chain** commit
(via the HAF-backed read client), not just the database's own stored copy
of the hash — see `server/src/routes/verify.js`.

## 3c. Backend server → Hetzner VPS (Laura)

The `server/` workspace (Express API + the daily Hive commit/reveal
automation) runs as an always-on process on a dedicated Hetzner box,
provisioned directly by Dr. Mohammad.

**Hive network: MAINNET — this is the real, standing production
configuration**, not a test setup. The commit/reveal automation runs
against Hive **mainnet**, using a **dedicated app account** (not any team
member's personal account), with a posting key scoped to **posting
authority only** — never active/owner. This key exists only as a GitHub
Actions secret and in the box's own local `.env`; it is never committed
and never echoed in any workflow log.

**Access & one-time setup on the box:**

```bash
ssh root@<HETZNER_HOST>
mkdir -p /root/lingo    # or wherever you choose -- this becomes HETZNER_LINGO_PATH
cd /root/lingo
git clone <repo-url> .
cd server
npm install
npm install -g pm2

# Create the real .env directly on the box -- never committed, never
# passed through GitHub Actions. Use server/.env.example as the template
# for which keys are needed (a separate .env.production.example was
# retired -- once local dev and production both standardized on
# HIVE_NETWORK=mainnet, the two files would have been near-duplicates,
# and keeping them in sync was just an extra place to forget).
nano .env

pm2 start ecosystem.config.js
pm2 save
pm2 startup              # follow the printed command once, so PM2 survives a reboot
```

**Ongoing deploys** happen automatically via
`.github/workflows/deploy-server.yml` — on every push to `main` touching
`server/**`, it SSHs in, pulls latest, reinstalls dependencies, and
restarts the PM2 process.

**Auth method:** key-based SSH auth, via `appleboy/ssh-action`'s `key:`
field and the `HETZNER_SSH_KEY` secret — confirmed working.

Required GitHub repo secrets:

| Secret | What it is |
|---|---|
| `HETZNER_HOST` | box's IPv4 address |
| `HETZNER_SSH_USER` | `root` |
| `HETZNER_SSH_KEY` | private half of the SSH keypair added to the box |
| `HETZNER_LINGO_PATH` | absolute path chosen above (e.g. `/root/lingo`) |
| `HIVE_APP_ACCOUNT` | dedicated app account (already added) |
| `HIVE_APP_POSTING_KEY` | posting-only key for that account (already added) |

**Scheduled commit/reveal workflows** (`daily_commit.yml`,
`daily_reveal.yml`) explicitly set `HIVE_NETWORK: mainnet` in their env
block — not left to the code's default (which is `testnet`), since
silently relying on that default would have meant running the mainnet
automation against the wrong chain.

**Manual mainnet verification — `mainnet-smoke.yml`:** a
`workflow_dispatch`-triggered GitHub Actions workflow that runs
`scripts/mainnet_smoke_test.js` directly on GitHub's Ubuntu runners
instead of locally. This exists specifically to sidestep a Windows-only
native-binary bug in `@hiveio/beekeeper` (a `boost::filesystem`
current-directory error) that blocked running the smoke test from a local
Windows machine — running it in CI's Linux environment avoids that class
of issue entirely. **Confirmed working** — a run produced real commit and
reveal tx ids. Trigger it manually from the Actions tab whenever a fresh
on-chain commit+reveal tx id needs to be produced as proof (e.g. for a
Definition-of-Done check). **Every run broadcasts real, permanent, public
transactions** — trigger deliberately, not routinely.

**Local alternative — Docker:** the same Windows native-binary issue can
also be sidestepped locally by running the smoke test inside a Linux
container (Docker Desktop) rather than directly on Windows — confirmed
working this way too. Useful if you want to verify something locally
without triggering the GitHub Actions workflow.

## 4. Branch / PR / deploy flow

`feature/*` → PR → `develop` → PR → `main` → auto-deploys (frontend to
Vercel, backend to Hetzner). Never push straight to `main`/`develop`. Open
a PR; Dr. Mohammad reviews & merges.

## 5. Secrets hygiene

Never commit `.env`, tokens, DB strings, or Hive posting keys. `.gitignore`
covers `.env` + `.vercel`. CI secrets → GitHub repo secrets. The Hetzner
box's own `.env` is set up once by hand over SSH and never touched by any
automated deploy — deploys only pull code, never write secrets. Hetzner
SSH credentials (host/user/password-or-key) were shared privately via DM,
never posted in the repo, an issue, or a PR.

## 6. SSH host fingerprint

The Hetzner production host uses the following ED25519 SHA-256 fingerprint:

`SHA256:CRHSMARNgnBQ7KUaDz+Tl9C/aFOSmQeI5GceF17mq2s`

It was verified directly on the production host with:

`ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub -E sha256`

It can also be independently compared from a client using `ssh-keyscan`.

If the server is rebuilt or its SSH host keys are regenerated, this fingerprint must be re-verified and the deployment workflow updated.