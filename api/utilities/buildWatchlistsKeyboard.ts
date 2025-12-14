import { InlineKeyboard } from 'grammy';
import type { List } from '../types.js';
import { ACTION_DIVIDER, WatchlistAction } from '../constants.js';

export const buildWatchlistsKeyboard = (
  watchlists: List[],
  action: WatchlistAction
) => {
  let watchlistsKeyboard = new InlineKeyboard();

  (watchlists ?? []).forEach((watchlist) => {
    if (watchlist.name) {
      watchlistsKeyboard = watchlistsKeyboard
        .text(watchlist.name, `${action}${ACTION_DIVIDER}${watchlist.id}`)
        .row();
    }
  });

  return watchlistsKeyboard;
};
