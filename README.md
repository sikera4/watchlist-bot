# Watchlist Telegram bot

The bot uses Firebase Admin on the server. Telegram user IDs are stored as strings. User provisioning runs in a transaction and never resets an existing watchlist array. A matching legacy numeric user ID is normalized when that user starts the bot or joins through an invitation; unrelated fields are preserved.

## Project layout

`api/bot.ts` is the only Vercel Function entry point and re-exports the handler from `src/bot.ts`. All bot logic, requests, types, and utilities belong under `src/`. Vercel treats supported source files under `api/` as function entries, so do not put helpers there: the old layout had 13 entries and exceeded the Hobby limit of 12. The webhook URL remains `/api/bot`.

TypeScript emits `build/api/bot.js` and `build/src/**`. Run `npm run lint:prettier` to format source, scripts, and tests, or `npm run format:check` to check formatting.

## Configuration

Use Node.js 22 and `npm ci`. Copy `.env.example` to your local `.env` and set the same values in the bot's hosting project (not only the Mini App's hosting project):

- `BOT_TOKEN`: Telegram bot token.
- `TELEGRAM_WEBHOOK_SECRET`: a randomly generated URL-safe secret, 32–256 characters. For example generate 32 random bytes encoded as hex with Node's `crypto.randomBytes(32).toString('hex')`. Store it privately; do not commit it.
- `FIREBASE_PROJECT_ID`: `watchlist-1f961` for the existing production database.
- `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`: Firebase Admin service account credentials. Both must be set together, or use Application Default Credentials on a compatible host. Escaped newlines in the private key are supported.
- `TELEGRAM_WEBHOOK_URL`: the actual deployed bot endpoint, e.g. `https://YOUR-BOT-DOMAIN/api/bot`. Used only by the explicit registration script.

The bot rejects non-POST requests and requests without the correct `X-Telegram-Bot-Api-Secret-Token` before initializing the bot or touching Firestore. It accepts both Vercel's parsed request body and raw HTTP bodies. It handles personal lists only in private chats.

## Invitations and access

- List retrieval checks the authenticated Telegram sender against `watchlists.userIds`, not user-side references.
- Any current member can create a reusable invitation valid for seven days. Anyone with that link can join; share it privately.
- Invitations contain 256 bits of randomness. Only a hash is stored as the `watchlistInvites` document ID, with the list ID, issuer, and expiry.
- Redemption checks the expiry, the list's existence, and whether the issuer is still a member. Both `users.watchlists` and `watchlists.userIds` are updated in one transaction; repeated deliveries do not duplicate entries.
- Old links containing raw watchlist IDs no longer work. An existing member must generate a new link. Removed references from the prior Mini App cleanup are not automatically restored; users can rejoin using a new authorized invitation.
- Expired invite records are rejected but not automatically deleted. A later cleanup/TTL policy can remove them.

Admin bypasses Firestore Security Rules, so authorization checks in the bot are essential. The Mini App rules must deny all client access to `watchlistInvites` (the proposed default-deny catch-all does this). Do not leave that collection accessible under permissive production rules.

## Verification

```sh
npm run typecheck
npm test
npm run test:firestore
```

The emulator tests require Java 21+ on PATH. They run only against `127.0.0.1:8080` and the hardcoded `demo-watchlist-bot` project, clear only that local test database, and need no production credentials. `npm test` builds the code and verifies webhook checks and HTML escaping without calling Telegram. The bot is deployed as a Vercel function, not a standalone long-polling server; the old broken `start` command has been removed.

Dependency audit checkpoint (2026-11-07): compatible fixes were applied, but npm still reports advisories in the tooling and the Firestore dependency chain (`google-gax` → `rimraf` → `glob`/`minimatch`). The runtime-only audit reported four moderate advisories; the full audit reported 21 (17 moderate, 4 high). These counts include affected parent packages. This is not a clean dependency audit. Review upstream fixes separately rather than blindly accepting npm's suggested forced CLI downgrade.

## Coordinated production rollout

1. Configure Admin credentials and a newly generated webhook secret in the bot's hosting environment. Save the previous deployment and current Firestore rules.
2. Deploy the bot and verify its environment. This change intentionally fails closed until the webhook secret is configured on both sides.
3. Set the same secret and actual bot endpoint in your local `.env`, then run `npm run webhook:configure`. This is an explicit external action; it is never run by the build. It registers the secret with Telegram and preserves pending updates. Coordinate it closely with deployment: updates may receive 401 and be retried during the transition.
4. Verify `/start`, list display, and an invitation between two accounts. New users must have string IDs; existing lists must be preserved.
5. Back up and normalize the remaining numeric IDs with the separately reviewed Mini App migration. Deploy the Mini App's atomic-create/membership-query changes, rerun its audit, then deploy the restrictive rules. Verify bot operations again after rules deployment.

Changing the code does not configure Vercel secrets, register the webhook, normalize all existing users, restore deleted references, or deploy rules. Those are separate rollout actions.

References: [Telegram webhook secrets](https://core.telegram.org/bots/api#setwebhook), [Firebase server access](https://firebase.google.com/docs/firestore/security/get-started).
