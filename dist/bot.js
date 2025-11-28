import { Bot } from 'grammy';
const botToken = '8586889965:AAGmmf2wxKYO2GCi6FZToYvYytw3AjC5U4g';
const bot = new Bot(botToken ?? '');
bot.command('start', (ctx) => ctx.reply('Welcome! Up and running.'));
bot.on('message', (ctx) => ctx.reply('Got another message!'));
bot.start();
//# sourceMappingURL=bot.js.map