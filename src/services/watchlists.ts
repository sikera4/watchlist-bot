import { createHash, randomBytes } from 'node:crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { Firestore, DocumentData } from 'firebase-admin/firestore';
import type { List } from '../types.js';

export class AccessError extends Error {}

export function canonicalUserId(value: number | string): string {
  if (
    typeof value === 'number' &&
    (!Number.isSafeInteger(value) || value <= 0)
  ) {
    throw new AccessError('Invalid user ID');
  }

  const id = String(value);

  if (!/^[1-9]\d*$/.test(id)) throw new AccessError('Invalid user ID');

  return id;
}

function validDocumentId(id: string) {
  return (
    id.length > 0 &&
    id.length <= 1500 &&
    !id.includes('/') &&
    id !== '.' &&
    id !== '..'
  );
}

function members(data: DocumentData | undefined): string[] {
  if (
    !Array.isArray(data?.userIds) ||
    data.userIds.length === 0 ||
    !data.userIds.every(
      (id: unknown) => typeof id === 'string' && /^[1-9]\d*$/.test(id)
    )
  ) {
    throw new AccessError('Invalid watchlist membership');
  }

  return data.userIds;
}

function checkUser(data: DocumentData | undefined, uid: string) {
  if (
    !data ||
    (data.userId !== uid &&
      !(
        typeof data.userId === 'number' &&
        Number.isSafeInteger(data.userId) &&
        String(data.userId) === uid
      )) ||
    !Array.isArray(data.watchlists) ||
    !data.watchlists.every((id: unknown) => typeof id === 'string')
  ) {
    throw new AccessError('Invalid user profile');
  }
}

export async function ensureUser(db: Firestore, value: number | string) {
  const uid = canonicalUserId(value);
  const ref = db.collection('users').doc(uid);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);

    if (!snapshot.exists) {
      transaction.create(ref, {
        userId: uid,
        watchlists: [],
        createdAt: FieldValue.serverTimestamp(),
      });
    } else {
      checkUser(snapshot.data(), uid);

      if (snapshot.get('userId') !== uid)
        transaction.update(ref, { userId: uid });
    }
  });
}

export async function readWatchlists(
  db: Firestore,
  value: number | string
): Promise<List[]> {
  const uid = canonicalUserId(value);

  const snapshot = await db
    .collection('watchlists')
    .where('userIds', 'array-contains', uid)
    .get();

  return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as List);
}

const inviteLifetimeMs = 7 * 24 * 60 * 60 * 1000;
const tokenPattern = /^i_[A-Za-z0-9_-]{43}$/;
const tokenHash = (token: string) =>
  createHash('sha256').update(token).digest('hex');

export async function issueInvite(
  db: Firestore,
  value: number | string,
  listId: string
) {
  const uid = canonicalUserId(value);

  if (!validDocumentId(listId)) throw new AccessError('Invalid watchlist');

  const token = `i_${randomBytes(32).toString('base64url')}`;

  await db.runTransaction(async (transaction) => {
    const list = await transaction.get(db.collection('watchlists').doc(listId));

    if (!list.exists || !members(list.data()).includes(uid))
      throw new AccessError('Not a member');

    transaction.create(
      db.collection('watchlistInvites').doc(tokenHash(token)),
      {
        watchlistId: listId,
        createdBy: uid,
        createdAt: FieldValue.serverTimestamp(),
        expiresAt: Timestamp.fromMillis(Date.now() + inviteLifetimeMs),
      }
    );
  });

  return token;
}

export async function redeemInvite(
  db: Firestore,
  value: number | string,
  token: string
) {
  const uid = canonicalUserId(value);

  // Legacy raw document IDs are not proof of an invitation.
  if (!tokenPattern.test(token)) throw new AccessError('Invalid invitation');

  await db.runTransaction(async (transaction) => {
    const invitation = await transaction.get(
      db.collection('watchlistInvites').doc(tokenHash(token))
    );
    const data = invitation.data();

    if (
      !data ||
      typeof data.watchlistId !== 'string' ||
      !validDocumentId(data.watchlistId) ||
      typeof data.createdBy !== 'string' ||
      !(data.expiresAt instanceof Timestamp) ||
      data.expiresAt.toMillis() <= Date.now()
    )
      throw new AccessError('Invalid or expired invitation');

    const listRef = db.collection('watchlists').doc(data.watchlistId);
    const userRef = db.collection('users').doc(uid);
    const [list, user] = await transaction.getAll(listRef, userRef);

    if (!list?.exists || !members(list.data()).includes(data.createdBy)) {
      throw new AccessError('Invitation no longer valid');
    }

    // Both writes commit together. Repeated Telegram deliveries are idempotent.
    if (user?.exists) {
      checkUser(user.data(), uid);

      transaction.update(userRef, {
        userId: uid,
        watchlists: FieldValue.arrayUnion(data.watchlistId),
      });
    } else {
      transaction.create(userRef, {
        userId: uid,
        watchlists: [data.watchlistId],
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    transaction.update(listRef, { userIds: FieldValue.arrayUnion(uid) });
  });
}
