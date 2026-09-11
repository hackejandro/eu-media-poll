# EUobserver Think Tank

A daily crowd-prediction game for EUobserver. Players guess how other readers will answer a binary question, cast their own vote, then return the next day to see the result and how accurately they read the room.

## Architecture

- **Frontend:** static HTML/CSS/JS on GitHub Pages.
- **Backend/admin:** Supabase Postgres with private dashboard tables and admin views.
- **Public users:** no login. The backend creates a memorable two-word Brussels identity such as `Sleepy Rapporteur` or `Caffeinated Lobbyist`; the browser stores its normalised form in `localStorage`. A player can remember or copy those two words and restore their history on another device.
- **Later account integration:** treat the Brussels identity as an anonymous participant key. When EUobserver login is added, associate that key with the authenticated account and keep the response history.

No personal information is required for this MVP. Raw responses are protected by RLS and are unavailable through the public API; the browser can only call the limited Think Tank RPCs.

## Game flow

1. On first visit, issue a two-word Brussels identity: adjective + Brussels character.
2. Show yesterday's result and personal accuracy if the player participated.
3. Ask today's question.
4. Player predicts the percentage who will choose option A.
5. Player chooses A or B for themselves.
6. Answer is locked for that identity/day.
7. The next day, show the actual crowd percentage, average prediction, player's error and percentage of players they beat.

Per-day newsletter URLs use `?day=YYYY-MM-DD`, for example:

`https://hackejandro.github.io/eu-media-poll/?day=2026-09-07`

Future links deliberately hide the question until that date.

## Set up Supabase

1. Create a Supabase project with the Data API enabled.
2. Run `supabase/schema.sql` in the SQL Editor.
3. Run `supabase/admin_views.sql` for dashboard-friendly editorial and result views.
4. Put the project URL and browser-safe publishable key in `config.js`.

The public tables use RLS and have no direct `anon` or `authenticated` access. Public clients can execute only the six Think Tank RPC functions granted in `supabase/schema.sql`. Never put a Supabase secret or legacy `service_role` key in the frontend.

## Connect the frontend

Edit `config.js`:

```js
window.THINK_TANK_CONFIG = {
  supabaseUrl: 'https://YOUR_PROJECT_REF.supabase.co',
  supabasePublishableKey: 'sb_publishable_YOUR_KEY',
  siteUrl: 'https://hackejandro.github.io/eu-media-poll/',
  timeZone: 'Europe/Brussels'
};
```

With either Supabase value empty, the frontend runs in self-contained demo mode.

## GitHub Pages

Enable Pages for the repository's default branch and root folder. If the repository is later renamed, update `siteUrl` in `config.js` and the quiz URLs in `supabase/admin_views.sql`.

## Reddit game

`reddit-app/` contains the Devvit Web version for r/euobserver. It shares the published question and aggregate response pool with this site, while privately mapping each signed-in Reddit account to a Brussels identity in Devvit Redis. See `reddit-app/README.md` for local testing and Reddit review requirements.

## Editorial workflow

1. Add/schedule questions in the Supabase `questions` table.
2. Fill `question`, `option_a`, `option_b`, optional source/editor note.
3. Set `status` to `PUBLISHED`.
4. Copy `quiz_url` from `think_tank_questions_admin` into the newsletter CMS.
5. The next day, open `think_tank_results_admin` for the aggregate result.

## Anonymous identity model

The identity is deliberately human-memorable rather than a random number: one adjective plus one Brussels character, for example `Sleepy Rapporteur`, `Sceptical Commissioner` or `Midnight Attaché`. Matching is case-insensitive.

The identity is continuity, not strong authentication. It prevents accidental duplicate voting and gives players a persistent history, but anyone who knows another player's two words could restore that identity. Do not describe the results as scientific polling. Once Think Tank is tied to EUobserver accounts, the anonymous identity can be migrated into the logged-in identity.

## Design

The frontend mirrors EUobserver's current visual system: navy `rgb(0,0,32)`, orange `rgb(240,82,60)`, Geist for interface text, Freight Text for editorial headlines, thin navy rules and pill buttons.
