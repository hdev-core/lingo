# LINGO — Deployment & Infrastructure Guide

Infra reference for **lingo** (Wordle-style word game, React + Vite frontend). Start here for
*"where does my code run"* and *"why can't I deploy X."*

**Your team & who owns which infra piece**
- **Laura Malaeb** — PostgreSQL schema & migrations on Supabase (§3b) + RLS security lockdown.
- **Intissar Soulaiman** — frontend / UI foundation (Wordle grid, app shell) + project scaffold.

---

## 1. Your stack — the simplest of the cohort

| Layer | What you use | Where it runs |
|-------|--------------|---------------|
| Frontend | React + Vite (`web`) | **Vercel** (root dir `web`) |
| Database | Postgres via **Prisma** | **Supabase** |
| Server-side logic (if any) | Supabase **Edge Function** | hosted by Supabase — no host to manage |
| Auth | Keychain + custodial Google provisioner | Hive-native, **not** Supabase Auth |

**You have NO always-on server to host.** Your frontend talks to Supabase directly (Supabase
client + **RLS** protecting the data), so there's no Express/indexer to deploy on Render or
Hetzner. That keeps your deployment story to just **Vercel + Supabase**.

---

## 2. "I can't deploy / connect X" — how access works

Connecting Supabase / Vercel to a repo in the **`hdev-core`** org needs an **org owner
(Dr. Mohammad)** to authorize that service's GitHub app — you can't self-authorize. To request:
comment on your DevOps card naming the **service** + that it's scoped to **lingo only**.
**Tip:** the Vercel *Actions* method (§3A) needs no org app.

---

## 3. Frontend → Vercel

**A) GitHub Actions + token (recommended).** Create a Vercel project, set **Root Directory = `web`**,
add repo secrets `VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID`, add `deploy.yml` +
`preview.yml` (see `HOSTING_GUIDE.md`). Push to `main` → auto-deploy; each PR → preview URL.
**B)** Or the owner authorizes the Vercel app (scoped to lingo) and you import it in Vercel.

## 3b. Database → Supabase + Prisma  *(Laura)*

1. Request the Supabase app scoped to **lingo** (§2).
2. Two connection strings — the #1 gotcha:
   - `DATABASE_URL` — pooled, port **6543**, add **`?pgbouncer=true`** (runtime).
   - `DIRECT_URL` — direct, port **5432** (Prisma **migrations**).
   Both in `.env` (**never commit**); `schema.prisma`: `url = env("DATABASE_URL")`, `directUrl = env("DIRECT_URL")`.
3. Supabase = DB/storage only. Auth stays Hive-native; canonical records go **on-chain**.

**Important for a word game:** never ship the answer/secret to the client. Keep the daily
answer + reveal-secret behind your RLS lockdown (not readable by the anon key), and if you need to
validate a guess server-side without exposing the answer, do it in a **Supabase Edge Function** —
that's serverless and Supabase-hosted, so you still don't manage a server.

---

## 4. Branch / PR / deploy flow

`feature/* → PR → develop → PR → main → auto-deploys`. Never push straight to `main`/`develop`.
Open a PR; **Dr. Mohammad reviews & merges**. Comment on your card + link the PR when you move it.

## 5. Secrets hygiene
Never commit `.env`, tokens, or DB strings. `.gitignore` `.env` + `.vercel`. CI secrets → GitHub repo secrets.
