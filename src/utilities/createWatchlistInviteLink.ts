import { escapeHtml } from './escapeHtml.js';

type Params = {
  botUsername: string;
  inviteToken: string;
  watchlistName?: string;
};

export const createWatchlistInviteLink = ({
  botUsername,
  inviteToken,
  watchlistName,
}: Params): string => {
  return `<a href="https://t.me/${botUsername}?start=${encodeURIComponent(inviteToken)}">${watchlistName ? `Приглашение в ${escapeHtml(watchlistName)}` : 'Приглашение'}</a>`;
};
