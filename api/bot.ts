import { Bot, InlineKeyboard, Keyboard, webhookCallback } from 'grammy';
import { MESSAGES } from './constants.js';
import { getWatchlists } from './requests/getWatchlists.js';

const token = process.env.BOT_TOKEN;
if (!token) throw new Error('BOT_TOKEN is unset');

const bot = new Bot(token);

const keyboard = new Keyboard()
  .text(MESSAGES.GET_MY_WATCHLISTS);

bot.command('start', async (ctx) => {
  await ctx.reply(MESSAGES.WELCOME, {
    reply_markup: keyboard
  })
});
bot.on('message', async (ctx) => {
  if (ctx.message.text === MESSAGES.GET_MY_WATCHLISTS) {
    const watchlists = await getWatchlists(ctx.from.id);

    const watchlistsNames = (watchlists ?? []).map(({ name }) => InlineKeyboard.text(name ?? ''));
    const watchlistsKeyboard = InlineKeyboard.from([watchlistsNames])

    await ctx.reply(MESSAGES.YOUR_WATCHLISTS, {
      reply_markup: watchlistsKeyboard
    })

    return;
  }

  await ctx.reply('Got another message!')
});

const botWithWebhook: unknown = webhookCallback(bot, 'https');

export default botWithWebhook;
