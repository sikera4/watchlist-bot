type Params = {
  botUsername: string;
  watchlistId: string;
  watchlistName?: string;
};

export const createWatchlistInviteLink = ({
  botUsername,
  watchlistId,
  watchlistName,
}: Params): string => {
  return `<a href="t.me/${botUsername}?start=${watchlistId}">${watchlistName ? `Приглашение в ${watchlistName}` : 'Приглашение'}</a>`;
};
