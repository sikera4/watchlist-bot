import { arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { db } from '../utilities/initializeFirebase.js';

export const addUserToWatchlist = async (
  userId: number,
  watchlistId: string
) => {
  const userDocRef = doc(db, 'users', String(userId));

  await updateDoc(userDocRef, {
    watchlists: arrayUnion(watchlistId),
  });
};
