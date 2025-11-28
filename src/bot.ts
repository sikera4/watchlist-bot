import { Bot } from 'grammy';

const bot = new Bot('8586889965:AAGmmf2wxKYO2GCi6FZToYvYytw3AjC5U4g');

bot.command('start', (ctx) => ctx.reply('Welcome! Up and running.'));
bot.on('message', (ctx) => ctx.reply('Got another message!'));

bot.start();
