import { readWatchlists } from '../services/watchlists.js';
import { getDb } from '../utilities/initializeFirebase.js';

export const getWatchlists = (userId: number) =>
  readWatchlists(getDb(), userId);
