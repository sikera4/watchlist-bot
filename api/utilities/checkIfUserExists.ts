import { checkIfDocumentExists } from './checkIfDocumentExists.js';
import { db } from './initializeFirebase.js';

export const checkIfUserExists = async (userId: number): Promise<boolean> => {
  return checkIfDocumentExists(db, 'users', String(userId));
};
