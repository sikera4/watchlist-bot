import { timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { webhookCallback } from 'grammy';
import type { Bot } from 'grammy';
import type { Update } from 'grammy/types';

export function createWebhookHandler(bot: Bot, secret: string) {
  if (!/^[A-Za-z0-9_-]{32,256}$/.test(secret)) {
    throw new Error(
      'TELEGRAM_WEBHOOK_SECRET must contain 32–256 URL-safe characters'
    );
  }
  const callback = webhookCallback(bot, 'callback', {
    secretToken: secret,
    timeoutMilliseconds: 9000,
  });
  return async (
    request: IncomingMessage & { body?: unknown },
    response: ServerResponse
  ) => {
    if (request.method !== 'POST') {
      response.setHeader('Allow', 'POST');
      response.writeHead(405).end();
      return;
    }
    const supplied = request.headers['x-telegram-bot-api-secret-token'];
    const expected = Buffer.from(secret);
    if (
      typeof supplied !== 'string' ||
      Buffer.byteLength(supplied) !== expected.length ||
      !timingSafeEqual(Buffer.from(supplied), expected)
    ) {
      response.writeHead(401).end();
      return;
    }
    let update: unknown;
    try {
      // Vercel may parse the body before invoking the handler; raw Node requests
      // are also supported for tests and other hosting environments.
      update = request.body;
      if (update === undefined) {
        const chunks: Buffer[] = [];
        let size = 0;
        for await (const chunk of request) {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          size += buffer.length;
          if (size > 1024 * 1024) {
            response.writeHead(413).end();
            return;
          }
          chunks.push(buffer);
        }
        update = Buffer.concat(chunks).toString('utf8');
      }
      if (typeof update === 'string' || Buffer.isBuffer(update))
        update = JSON.parse(update.toString());
      if (
        !update ||
        typeof update !== 'object' ||
        !('update_id' in update) ||
        !Number.isSafeInteger(update.update_id)
      )
        throw new Error('Invalid update');
    } catch {
      response.writeHead(400).end();
      return;
    }
    await callback(
      update as Update,
      (json: string) => {
        response
          .writeHead(200, { 'Content-Type': 'application/json' })
          .end(json);
      },
      secret
    );
    if (!response.writableEnded) response.end();
  };
}
