# Analytics and the /admin dashboard

Pawnce records anonymous usage events and shows them on a private page:
**https://pawnce.vercel.app/admin** (password protected).

## What's recorded (and what isn't)

- **Events:** page views, game started (bot, side, time control), game
  finished (result, how it ended, moves, length), hint used, take back,
  mistake card shown (inaccuracy / mistake / blunder), new word met, word
  opened, word-card pause, flash cards opened, quiz finished, report card
  opened, theme changed.
- **About the visitor:** a random id for the browser (to count unique
  visitors), a random id for the visit, the screen size class (phone /
  tablet / desktop), the country Vercel already knows, and where they came
  from (the referring website, on the first page of a visit).
- **Never:** names, emails, IP addresses, or the moves of a game.
- Automated browsers (tests, bots) aren't counted. Your own browser stops
  being counted the first time you sign in to /admin ("Count my visits" turns
  it back on).

Code: the tracker is `src/analytics/track.ts`; the server is one Vercel
Function, `api/analytics.ts` (`POST` records, `GET` reads for the dashboard);
the page is `src/components/AdminPage.tsx`.

## One-time setup (5 minutes, free)

1. **Add the database.** Vercel → the *pawnce* project → **Storage** →
   **Create Database** → **Upstash for Redis** (free plan) → create it and
   **connect it to the pawnce project** (all environments). This adds
   `KV_REST_API_URL` and `KV_REST_API_TOKEN` automatically.
2. **Choose your password.** Vercel → pawnce → **Settings → Environment
   Variables** → add `ADMIN_PASSWORD` (any long password you like) for
   Production (and Preview if you want).
3. **Redeploy.** Vercel → **Deployments** → the latest → ⋯ → **Redeploy**.
4. Open **/admin**, enter the password.

Until then the app works as usual (events are simply not stored) and /admin
shows which step is missing.

## How the numbers are stored

Daily counters in Redis (`pc:d:YYYY-MM-DD`), a few KB a day. Unique
visitors, players, finishers and flash-card users per day are HyperLogLog
sketches (estimates within about 1%, and no list of ids is kept). The last
100 events are kept as a live feed. Each event is one request of about 6 to 8
Redis commands, and opening the dashboard costs about 4 commands per day
shown. Upstash's free plan limits commands per month (see upstash.com/pricing):
plenty for an early product. If traffic grows past it, the pay-as-you-go plan
costs cents.

## Local development

`npm run dev` serves the same API from memory; the admin password is `dev`.
Tracking is off in automated browsers; tests turn it on with
`localStorage['pawnce.forceTrack'] = '1'`.
