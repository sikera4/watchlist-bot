import { collection, doc, documentId, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "../utilities/initializeFirebase.js";
import type { List } from "../types.js";

export const getWatchlists = async (userId: number) => {
  const userDocRef = doc(db, 'users', String(userId));
  const userDoc = await getDoc(userDocRef);

  if (userDoc.exists()) {
    const { watchlists } = userDoc.data() as {
      watchlists: string[]
    };

    const watchlistsCollection = collection(db, 'watchlists');

    const q = query(watchlistsCollection, where(documentId(), 'in', watchlists));

    const querySnapshot = await getDocs(q);

    const lists: List[] = [];

    querySnapshot.forEach((doc) => {
      lists.push({ id: doc.id, ...doc.data() } as List);
    });

    return lists;
  }

  return null;
}
