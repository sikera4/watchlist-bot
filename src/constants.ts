export const MESSAGES = {
  WELCOME: 'Добро пожаловать! Что хотите сделать?',
  GET_MY_WATCHLISTS: 'Получить мои списки для просмотра',
  YOUR_WATCHLISTS: 'Ваши списки для просмотра:',
  CREATE_INVITE_LINK: 'Создать ссылку-приглашение для моего списка',
  CHOOSE_WATCHLIST_TO_SHARE:
    'Выберите список для просмотра, которым хотите поделиться:',
  MANAGE_WATCHLISTS: 'Управлять моими списками для просмотра',
};

export const enum WatchlistAction {
  Show = 'show',
  Invite = 'invite',
}

export const ACTION_DIVIDER = '::';

export const WEB_APP_URL = 'https://watchlist-mini-app.vercel.app/';
