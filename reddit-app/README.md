# EUobserver Think Tank for Reddit

An interactive daily perception game for r/euobserver. Players predict how the community will vote, cast their own vote, then return the next day to compare their prediction with the crowd.

## How it works

- An editor approves future questions by marking them `PUBLISHED` in the existing Think Tank Supabase project. Their `day` field is the publication date.
- At 06:00 Europe/Brussels each day, the Reddit scheduler creates that day’s custom post. It checks both possible UTC hours so daylight-saving changes are handled automatically.
- Duplicate scheduler deliveries and manual retries resolve to the same post through a Redis day key.
- Each new post receives an idempotent bot comment naming up to three top-scoring Reddit players from the previous day.
- A moderator can still choose **Publish today’s Think Tank** from the subreddit app menu as a manual fallback.
- A signed-in Reddit account is privately mapped to a generated Brussels identity. The Reddit username and user ID are never sent to Supabase.
- Answers use the same Supabase RPCs as the public website, so both audiences contribute to one result.
- Streaks and the short-lived Reddit leaderboard roster are stored in the app’s private Redis database.

## Local development

Requires Node.js 24 or newer.

```sh
npm install
npm run verify
npm run dev
```

Playtest in a small test subreddit before installing on r/euobserver.

## Fetch Domains

- `czvyukhxfdvjgljgxrke.supabase.co` — reads published Think Tank questions, creates pseudonymous Brussels identities, submits answers, and reads aggregate results. Only the browser-safe Supabase publishable key is used. Reddit account identifiers are not transmitted.

## Privacy

See [PRIVACY.md](PRIVACY.md).

## Terms

See [TERMS.md](TERMS.md).
