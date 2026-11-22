# TFT Friends Ladder

A small Next.js + Supabase app for a private Teamfight Tactics ranked leaderboard.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS
- Supabase PostgreSQL
- Riot Games API
- GitHub Actions scheduler (30-minute schedule)

## 1. Create the Supabase database

1. Create a Supabase project.
2. Open **SQL Editor**.
3. Run `supabase/schema.sql`.
4. Copy the Project URL and `service_role` key from Project Settings → API.

The service-role key bypasses RLS. It is used only in server routes. Never prefix it with `NEXT_PUBLIC_`.

## 2. Configure Riot API

1. Sign in at https://developer.riotgames.com/.
2. Create/register this private TFT leaderboard project and request the appropriate API key.
3. Copy the key into `RIOT_API_KEY`.
4. This starter assumes EUW ranked accounts (`euw1`) and the Europe account routing cluster.

Riot development keys expire every 24 hours. A personal key is more suitable for a small private community, subject to Riot approval and policy. Register the product as required by Riot's TFT policy.

## 3. Run locally

```bash
npm install
cp .env.example .env.local
# Fill in every required value in .env.local
npm run dev
```

Open http://localhost:3000.

## 4. Add players

Open the **Admin** section at the bottom of the leaderboard. Enter each player's Riot ID and the `ADMIN_SECRET` value. The player is resolved through Account-V1 and added to the active competition.

## 5. Configure automatic sync

This starter uses GitHub Actions to call the protected sync endpoint every 30 minutes. This keeps the 30-minute schedule compatible with Vercel Hobby hosting, whose native Cron Jobs only support daily schedules.

In the GitHub repository, open **Settings → Secrets and variables → Actions** and add:

- `APP_URL`: your deployed Vercel URL, e.g. `https://your-app.vercel.app`
- `CRON_SECRET`: the same value configured in Vercel

The workflow is in `.github/workflows/riot-sync.yml`. You can also run it manually from the Actions tab. GitHub scheduled workflows can be delayed, so 30 minutes is the target cadence, not a guaranteed exact execution time.

For a manual first sync, call `GET /api/cron/sync` with header:

```text
Authorization: Bearer YOUR_CRON_SECRET
```

## 6. Deploy to Vercel

1. Push this project to a private GitHub repository.
2. Import the repository into Vercel.
3. Add all variables from `.env.example` in Vercel Project Settings → Environment Variables.
4. Deploy. Then add `APP_URL` and `CRON_SECRET` to GitHub Actions secrets as described above.

## Environment variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (safe to expose) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only database key |
| `RIOT_API_KEY` | Server-only Riot API key |
| `RIOT_PLATFORM_ROUTING` | `euw1` for EUW |
| `RIOT_REGIONAL_ROUTING` | `europe` for Riot ID lookup |
| `CRON_SECRET` | Protects scheduled sync route; also add as GitHub Actions secret |
| `ADMIN_SECRET` | Protects add-player route |
| `NEXT_PUBLIC_COMPETITION_NAME` | Display name |

## Current MVP scope / known follow-ups

- Public read-only leaderboard; admin-only add-player API.
- No player login or user accounts.
- Rank snapshots are stored only when the ranked entry changes.
- Unranked players are not shown until Riot returns a ranked entry.
- Add a proper admin session/login before sharing admin access with more than one trusted person. The current shared admin secret is a minimal private-project gate.
- Add a sync lock if multiple workflow executions can overlap, plus a persistent sync-status table and richer retry/backoff handling.
- Set name is seeded as a placeholder; update it in Supabase for the current live TFT set.
- Riot API response schemas and endpoint availability should be verified against the current Developer Portal when activating the API key.
