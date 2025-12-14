import { Bot, Keyboard, webhookCallback } from 'grammy';
import { ACTION_DIVIDER, MESSAGES, WatchlistAction } from './constants.js';
import { getWatchlists } from './requests/getWatchlists.js';
import { buildWatchlistsKeyboard } from './utilities/buildWatchlistsKeyboard.js';
import { formatWatchlist } from './utilities/formatWatchlist.js';
import { createWatchlistInviteLink } from './utilities/createWatchlistInviteLink.js';
import { checkIfUserExists } from './utilities/checkIfUserExists.js';
import { addUserToWatchlist } from './requests/addUserToWatchlist.js';
import { addUser } from './requests/addUser.js';

const token = process.env.BOT_TOKEN;
if (!token) throw new Error('BOT_TOKEN is unset');

const bot = new Bot(token);

const keyboard = new Keyboard()
  .text(MESSAGES.GET_MY_WATCHLISTS)
  .row()
  .text(MESSAGES.CREATE_INVITE_LINK);

bot.command('start', async (ctx) => {
  const userId = ctx.from?.id;

  if (userId && !checkIfUserExists(userId)) {
    await addUser(userId);
  }

  const startParam = ctx.match;

  if (userId && startParam) {
    await addUserToWatchlist(userId, startParam);
  }

  await ctx.reply(MESSAGES.WELCOME, {
    reply_markup: keyboard,
  });
});

bot.on('message', async (ctx) => {
  if (ctx.message.text === MESSAGES.GET_MY_WATCHLISTS) {
    const watchlists = await getWatchlists(ctx.from.id);

    const watchlistsKeyboard = buildWatchlistsKeyboard(
      watchlists ?? [],
      WatchlistAction.Show
    );

    await ctx.reply(MESSAGES.YOUR_WATCHLISTS, {
      reply_markup: watchlistsKeyboard,
    });

    return;
  }

  if (ctx.message.text === MESSAGES.CREATE_INVITE_LINK) {
    const watchlists = await getWatchlists(ctx.from.id);

    const watchlistsKeyboard = buildWatchlistsKeyboard(
      watchlists ?? [],
      WatchlistAction.Invite
    );

    await ctx.reply(MESSAGES.CHOOSE_WATCHLIST_TO_SHARE, {
      reply_markup: watchlistsKeyboard,
    });

    return;
  }

  await ctx.reply('Got another message!');
});

bot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data;
  const [action, watchlistId] = data.split(ACTION_DIVIDER);

  if (!action || !watchlistId) {
    return;
  }

  if (action === WatchlistAction.Show) {
    const watchlists = await getWatchlists(ctx.from.id);
    const selectedWatchlist = (watchlists ?? []).find(
      ({ id }) => id === watchlistId
    );

    if (selectedWatchlist) {
      await ctx.reply(`Вы выбрали список: ${selectedWatchlist.name}`);
      await ctx.reply(formatWatchlist(selectedWatchlist.movies), {
        parse_mode: 'HTML',
      });

      await ctx.answerCallbackQuery();
    }

    return;
  }

  if (action === WatchlistAction.Invite) {
    const watchlists = await getWatchlists(ctx.from.id);
    const selectedWatchlist = (watchlists ?? []).find(
      ({ id }) => id === watchlistId
    );

    if (selectedWatchlist) {
      await ctx.reply(`Вы выбрали список: ${selectedWatchlist.name}`);

      const inviteLink = createWatchlistInviteLink({
        botUsername: bot.botInfo.username,
        watchlistId,
        watchlistName: selectedWatchlist.name,
      });
      await ctx.reply(inviteLink, {
        parse_mode: 'HTML'
      });

      await ctx.answerCallbackQuery();
    }

    return;
  }
});

const botWithWebhook: unknown = webhookCallback(bot, 'https');

export default botWithWebhook;
