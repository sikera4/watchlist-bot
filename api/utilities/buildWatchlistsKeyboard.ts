import { InlineKeyboard } from "grammy";
import type { List } from "../types.js";

export const buildWatchlistsKeyboard = (watchlists: List[]) => {
  let watchlistsKeyboard = new InlineKeyboard();

  (watchlists ?? []).forEach((watchlist) => {
    if (watchlist.name) {
      watchlistsKeyboard = watchlistsKeyboard.text(watchlist.name).row();
    }
  });

  return watchlistsKeyboard;
}
