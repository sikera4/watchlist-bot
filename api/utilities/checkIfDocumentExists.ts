import { doc, Firestore, getDoc } from 'firebase/firestore';

export const checkIfDocumentExists = async (
  db: Firestore,
  collection: string,
  documentId: string
): Promise<boolean> => {
  const docRef = doc(db, collection, documentId);
  const docSnap = await getDoc(docRef);

  return docSnap.exists();
};
