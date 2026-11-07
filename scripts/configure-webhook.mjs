// Explicit deployment action: never runs during build or application startup.
const { BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, TELEGRAM_WEBHOOK_URL } =
  process.env;
if (
  !BOT_TOKEN ||
  !TELEGRAM_WEBHOOK_SECRET ||
  !/^[A-Za-z0-9_-]{32,256}$/.test(TELEGRAM_WEBHOOK_SECRET)
) {
  throw new Error(
    'Set BOT_TOKEN and a 32–256 character URL-safe TELEGRAM_WEBHOOK_SECRET'
  );
}
const url = new URL(TELEGRAM_WEBHOOK_URL ?? '');
if (url.protocol !== 'https:' || url.username || url.password)
  throw new Error('Use an HTTPS webhook URL');
try {
  const response = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: url.href,
        secret_token: TELEGRAM_WEBHOOK_SECRET,
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: false,
      }),
      signal: AbortSignal.timeout(15000),
    }
  );
  const result = await response.json();
  if (!response.ok || !result.ok)
    throw new Error('Webhook registration failed');
  console.log(
    'Webhook registered with secret verification; pending updates preserved.'
  );
} catch {
  console.error(
    'Webhook registration failed. Check credentials, URL, and connectivity.'
  );
  process.exitCode = 1;
}
