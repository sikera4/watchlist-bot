import { Bot, Keyboard, webhookCallback } from 'grammy';

const token = process.env.BOT_TOKEN;
if (!token) throw new Error('BOT_TOKEN is unset');

const bot = new Bot(token);

const keyboard = new Keyboard()
  .text('Получить мои списки для просмотра');

bot.command('start', async (ctx) => {
  await ctx.reply('Добро пожаловать! Что хотите сделать?', {
    reply_markup: keyboard
  })
});
bot.on('message', (ctx) => ctx.reply('Got another message!'));

const botWithWebhook: unknown = webhookCallback(bot, 'https');

export default botWithWebhook;
