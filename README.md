# EUobserver Think Tank

A daily crowd-prediction game for EUobserver. Players guess how other readers will answer a binary question, cast their own vote, then return the next day to see the result and how accurately they read the room.

## Architecture

- **Frontend:** static HTML/CSS/JS on GitHub Pages.
- **Backend/admin:** a private Google Sheet with a bound Google Apps Script Web App.
- **Public users:** no login. The backend creates a random Brussels code such as `SCHUMAN-48271`; the browser stores it in `localStorage`. A player can copy that code and restore it on another device.
- **Later account integration:** treat the Brussels code as an anonymous participant key. When EUobserver login is added, associate that key with the authenticated account and keep the response history.

No personal information is required for this MVP. Raw responses live only in the private Sheet.

## Game flow

1. On first visit, issue a Brussels code.
2. Show yesterday's result and personal accuracy if the player participated.
3. Ask today's question.
4. Player predicts the percentage who will choose option A.
5. Player chooses A or B for themselves.
6. Answer is locked for that code/day.
7. The next day, show the actual crowd percentage, average prediction, player's error and percentage of players they beat.

Per-day newsletter URLs use `?day=YYYY-MM-DD`, for example:

`https://hackejandro.github.io/eu-media-poll/?day=2026-09-07`

Future links deliberately hide the question until that date.

## Set up the Google Sheet backend

1. Create a new private Google Sheet called something like **EUobserver Think Tank Admin**.
2. Open **Extensions → Apps Script**.
3. Copy `apps-script/Code.gs` into the Apps Script editor and save.
4. Run `setupThinkTank()` once and approve Google's permissions.
5. Return to the Sheet. It will contain:
   - `Questions` — editorial queue and canonical daily links
   - `Results` — aggregate dashboard
   - `Responses` — raw anonymous answers
   - `Participants` — Brussels codes
   - `Settings` — site URL and minimum sample for ranking
6. Edit the sample question rows. Set `status` to `PUBLISHED` when a day is ready. `DRAFT` questions never appear publicly.

The **Think Tank** menu in Sheets can add tomorrow's row, refresh URLs and rebuild the results dashboard.

## Deploy Apps Script

1. In Apps Script choose **Deploy → New deployment**.
2. Type: **Web app**.
3. Execute as: **Me**.
4. Who has access: **Anyone**.
5. Deploy and copy the `/exec` Web App URL.

Public access is necessary because the game has no login. Editors still manage all content in the private Google Sheet; the Web App has no public question-writing/admin endpoint.

## Connect the frontend

Edit `config.js`:

```js
window.THINK_TANK_CONFIG = {
  apiUrl: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',
  siteUrl: 'https://hackejandro.github.io/eu-media-poll/',
  timeZone: 'Europe/Brussels'
};
```

With `apiUrl: ''`, the frontend runs in self-contained demo mode.

## GitHub Pages

Enable Pages for the repository's default branch and root folder after merging the `think-tank` branch. If the repository is later renamed to `think-tank`, update `siteUrl` in both `config.js` and the Sheet's `Settings` tab, then run **Think Tank → Refresh quiz links**.

## Editorial workflow

1. Add/schedule questions in `Questions`.
2. Fill `question`, `option_a`, `option_b`, optional source/editor note.
3. Set `status` to `PUBLISHED`.
4. Copy the generated `quiz_url` into the newsletter CMS.
5. The next day, open `Results` or use **Think Tank → Refresh results dashboard**.

## Important limitation

The Brussels code is continuity, not strong identity. It prevents accidental duplicate voting and gives players a persistent history, but a determined person can create multiple codes. Do not describe the results as scientific polling. Once Think Tank is tied to EUobserver accounts, the anonymous code can be migrated into the logged-in identity.

## Design

The frontend mirrors EUobserver's current visual system: navy `rgb(0,0,32)`, orange `rgb(240,82,60)`, Geist for interface text, Freight Text for editorial headlines, thin navy rules and pill buttons.
