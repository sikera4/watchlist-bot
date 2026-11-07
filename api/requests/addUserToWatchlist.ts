import { redeemInvite } from '../services/watchlists.js';
import { getDb } from '../utilities/initializeFirebase.js';

export const addUserToWatchlist = (userId: number, inviteToken: string) =>
  redeemInvite(getDb(), userId, inviteToken);
