import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { test } from 'node:test';

test('only the webhook is exposed as a Vercel function', async () => {
  const files = await readdir(new URL('../api/', import.meta.url), {
    recursive: true,
    withFileTypes: true,
  });
  const entries = files
    .filter((entry) => entry.isFile() && !entry.name.startsWith('.'))
    .map((entry) => entry.name);

  assert.deepEqual(entries, ['bot.ts']);
});

test('compiled webhook entry loads and rejects untrusted requests without Firebase credentials', () => {
  execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `
    import assert from 'node:assert/strict';
    import handler from './build/api/bot.js';

    const response = {
      status: 0,
      writeHead(status) { this.status = status; return this; },
      end() {},
    };

    await handler({ method: 'POST', headers: {} }, response);
    assert.equal(response.status, 401);
  `,
    ],
    {
      cwd: new URL('../', import.meta.url),
      env: {
        BOT_TOKEN: '123:deployment-test',
        TELEGRAM_WEBHOOK_SECRET: 's'.repeat(32),
      },
      stdio: 'pipe',
    }
  );
});
