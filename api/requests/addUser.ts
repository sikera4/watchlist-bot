import { ensureUser } from '../services/watchlists.js';
import { getDb } from '../utilities/initializeFirebase.js';

export const addUser = (userId: number) => ensureUser(getDb(), userId);
