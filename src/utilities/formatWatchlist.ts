import type { MediaItem } from '../types.js';
import { escapeHtml } from './escapeHtml.js';

export const formatWatchlist = (items: MediaItem[]) => {
  return items
    .map((item) => {
      return `<b>${escapeHtml(item.title)}${item.isSeen ? ' ✅' : ''}</b>`;
    })
    .join('\n');
};
