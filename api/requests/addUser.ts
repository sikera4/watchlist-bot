import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../utilities/initializeFirebase.js';

export const addUser = async (userId: number) => {
  const usersCollectionRef = collection(db, 'users');
  const userDocRef = doc(usersCollectionRef, String(userId));

  await setDoc(userDocRef, { userId, watchlists: [] });
};
