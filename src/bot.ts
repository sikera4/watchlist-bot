import { Bot, Keyboard } from 'grammy';
import { ACTION_DIVIDER, MESSAGES, WatchlistAction } from './constants.js';
import { getWatchlists } from './requests/getWatchlists.js';
import { buildWatchlistsKeyboard } from './utilities/buildWatchlistsKeyboard.js';
import { formatWatchlist } from './utilities/formatWatchlist.js';
import { createWatchlistInviteLink } from './utilities/createWatchlistInviteLink.js';
import { addUserToWatchlist } from './requests/addUserToWatchlist.js';
import { addUser } from './requests/addUser.js';
import { AccessError, issueInvite } from './services/watchlists.js';
import { getDb } from './utilities/initializeFirebase.js';
import { createWebhookHandler } from './utilities/webhook.js';

const token = process.env.BOT_TOKEN;

if (!token) throw new Error('BOT_TOKEN is unset');

const bot = new Bot(token);

// Keep personal watchlists and invitation links out of group chats.
bot.use(async (ctx, next) => {
  if (ctx.chat?.type !== 'private') return;

  await next();
});

const keyboard = new Keyboard()
  .text(MESSAGES.GET_MY_WATCHLISTS)
  .row()
  .text(MESSAGES.CREATE_INVITE_LINK);

bot.command('start', async (ctx) => {
  const userId = ctx.from?.id;

  if (!userId) {
    return;
  }

  const startParam = ctx.match;

  try {
    if (startParam) {
      await addUserToWatchlist(userId, startParam);
      await ctx.reply('Список добавлен.');
    } else {
      await addUser(userId);
    }
  } catch (error) {
    if (!(error instanceof AccessError)) throw error;

    await ctx.reply(
      'Не удалось открыть приглашение или профиль. Попросите новую ссылку у участника списка.'
    );

    return;
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

      if (selectedWatchlist.items.length) {
        await ctx.reply(formatWatchlist(selectedWatchlist.items), {
          parse_mode: 'HTML',
        });
      } else {
        await ctx.reply('Список пуст.');
      }
    }

    await ctx.answerCallbackQuery();

    return;
  }

  if (action === WatchlistAction.Invite) {
    const watchlists = await getWatchlists(ctx.from.id);
    const selectedWatchlist = (watchlists ?? []).find(
      ({ id }) => id === watchlistId
    );

    if (selectedWatchlist) {
      await ctx.reply(`Вы выбрали список: ${selectedWatchlist.name}`);

      let inviteToken: string;

      try {
        inviteToken = await issueInvite(getDb(), ctx.from.id, watchlistId);
      } catch (error) {
        if (!(error instanceof AccessError)) throw error;

        await ctx.answerCallbackQuery({ text: 'Список больше недоступен' });

        return;
      }

      const inviteLink = createWatchlistInviteLink({
        botUsername: bot.botInfo.username,
        inviteToken,
        watchlistName: selectedWatchlist.name ?? '',
      });

      await ctx.reply(inviteLink, {
        parse_mode: 'HTML',
      });
      await ctx.reply(
        'Ссылка действует 7 дней. Любой, у кого есть ссылка, сможет присоединиться к списку.'
      );
    }

    await ctx.answerCallbackQuery();

    return;
  }
});

const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

if (!secret) throw new Error('TELEGRAM_WEBHOOK_SECRET is unset');

const botWithWebhook = createWebhookHandler(bot, secret);

export default botWithWebhook;
