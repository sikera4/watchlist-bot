import type { MovieInList } from '../types.js';

export const formatWatchlist = (moviesList: MovieInList[]) => {
  return moviesList
    .map((movie) => {
      return `<b>${movie.title}${movie.isSeen ? ' ✅' : ''}</b>`;
    })
    .join('\n');
};
