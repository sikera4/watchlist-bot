import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Readable } from 'node:stream';
import { Bot } from 'grammy';
import { createWebhookHandler } from '../build/src/utilities/webhook.js';
import { createWatchlistInviteLink } from '../build/src/utilities/createWatchlistInviteLink.js';
import { formatWatchlist } from '../build/src/utilities/formatWatchlist.js';

const secret = 's'.repeat(32);

function setup() {
  const bot = new Bot('123:fake', {
    botInfo: {
      id: 123,
      is_bot: true,
      first_name: 'Test',
      username: 'test_bot',
      can_join_groups: false,
      can_read_all_group_messages: false,
      supports_inline_queries: false,
    },
  });
  const updates = [];

  bot.use((ctx) => {
    updates.push(ctx.update);
  });

  return { handler: createWebhookHandler(bot, secret), updates };
}

async function invoke(
  handler,
  { method = 'POST', header = secret, body, raw = '{}' } = {}
) {
  const req = Readable.from([Buffer.from(raw)]);

  req.method = method;
  req.headers =
    header === null ? {} : { 'x-telegram-bot-api-secret-token': header };

  if (body !== undefined) req.body = body;

  const res = {
    statusCode: 200,
    writableEnded: false,
    setHeader() {},
    writeHead(status) {
      this.statusCode = status;

      return this;
    },
    end() {
      this.writableEnded = true;

      return this;
    },
  };

  await handler(req, res);

  return res;
}

test('rejects absent, wrong, and duplicate webhook secrets before handling an update', async () => {
  const { handler, updates } = setup();

  for (const header of [null, '', 'wrong', 'x'.repeat(32), [secret, secret]]) {
    assert.equal((await invoke(handler, { header })).statusCode, 401);
  }

  assert.deepEqual(updates, []);
});

test('rejects non-POST requests and invalid JSON', async () => {
  const { handler, updates } = setup();

  assert.equal((await invoke(handler, { method: 'GET' })).statusCode, 405);
  assert.equal((await invoke(handler, { raw: '{' })).statusCode, 400);
  assert.equal((await invoke(handler, { body: {} })).statusCode, 400);
  assert.deepEqual(updates, []);
});

test('accepts both Vercel parsed bodies and raw HTTP updates with the correct secret', async () => {
  const { handler, updates } = setup();

  assert.equal(
    (await invoke(handler, { body: { update_id: 1 } })).statusCode,
    200
  );
  assert.equal(
    (await invoke(handler, { raw: JSON.stringify({ update_id: 2 }) }))
      .statusCode,
    200
  );
  assert.deepEqual(updates, [{ update_id: 1 }, { update_id: 2 }]);
});

test('requires a strong webhook secret at startup', () => {
  assert.throws(() => createWebhookHandler(new Bot('123:fake'), ''));
  assert.throws(() => createWebhookHandler(new Bot('123:fake'), 'short'));
});

test('escapes watchlist and movie names in Telegram HTML', () => {
  const link = createWatchlistInviteLink({
    botUsername: 'test_bot',
    inviteToken: 'i_token',
    watchlistName: '<b>A&B</b>',
  });

  assert.ok(link.includes('https://t.me/test_bot?start=i_token'));
  assert.ok(link.includes('&lt;b&gt;A&amp;B&lt;/b&gt;'));
  assert.equal(
    formatWatchlist([{ title: '<script>', isSeen: true }]),
    '<b>&lt;script&gt; ✅</b>'
  );
});
