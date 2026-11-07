import {
  applicationDefault,
  cert,
  getApp,
  getApps,
  initializeApp,
} from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export function getDb() {
  if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;

    if (!projectId) throw new Error('FIREBASE_PROJECT_ID is required');

    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (Boolean(clientEmail) !== Boolean(privateKey)) {
      throw new Error(
        'Both FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY are required together'
      );
    }

    initializeApp({
      projectId,
      credential:
        clientEmail && privateKey
          ? cert({ projectId, clientEmail, privateKey })
          : applicationDefault(),
    });
  }

  return getFirestore(getApp());
}
