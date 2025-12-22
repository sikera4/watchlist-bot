import type { MediaItem } from '../types.js';

export const formatWatchlist = (items: MediaItem[]) => {
  return items
    .map((item) => {
      return `<b>${item.title}${item.isSeen ? ' ✅' : ''}</b>`;
    })
    .join('\n');
};
