import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { createHash } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import {
  AccessError,
  canonicalUserId,
  ensureUser,
  issueInvite,
  redeemInvite,
  readWatchlists,
} from '../build/services/watchlists.js';

const projectId = 'demo-watchlist-bot';
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080')
  throw new Error('Run npm run test:firestore');
let app, db;
const hash = (token) => createHash('sha256').update(token).digest('hex');
before(() => {
  app = initializeApp({ projectId });
  db = getFirestore(app);
});
after(async () => {
  await deleteApp(app);
});
beforeEach(async () => {
  const response = await fetch(
    `http://127.0.0.1:8080/emulator/v1/projects/${projectId}/databases/(default)/documents`,
    { method: 'DELETE' }
  );
  assert.equal(response.ok, true);
  await db
    .doc('users/1001')
    .set({ userId: '1001', watchlists: ['owned'], extra: 'preserve' });
  await db
    .doc('watchlists/owned')
    .set({
      name: 'Movies',
      userIds: ['1001'],
      items: [{ id: 42, title: 'Example' }],
    });
});

test('user IDs are canonical strings; invalid numeric IDs are rejected', () => {
  assert.equal(canonicalUserId(1001), '1001');
  for (const value of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, '01', 'abc'])
    assert.throws(() => canonicalUserId(value));
});
test('user provisioning is idempotent and never resets existing fields or lists', async () => {
  await Promise.all([ensureUser(db, 1002), ensureUser(db, 1002)]);
  assert.equal((await db.doc('users/1002').get()).get('userId'), '1002');
  await Promise.all([ensureUser(db, 1001), ensureUser(db, 1001)]);
  const data = (await db.doc('users/1001').get()).data();
  assert.deepEqual(data.watchlists, ['owned']);
  assert.equal(data.extra, 'preserve');
});
test('normalizes a matching legacy numeric user ID without changing its lists', async () => {
  await db.doc('users/1001').update({ userId: 1001 });
  await ensureUser(db, 1001);
  assert.equal((await db.doc('users/1001').get()).get('userId'), '1001');
  assert.deepEqual((await db.doc('users/1001').get()).get('watchlists'), [
    'owned',
  ]);
  await db.doc('users/1001').update({ userId: 999 });
  await assert.rejects(ensureUser(db, 1001), AccessError);
});
test('queries membership instead of trusting stale or foreign references', async () => {
  await db
    .doc('users/1002')
    .set({ userId: '1002', watchlists: ['owned', 'missing'] });
  assert.deepEqual(await readWatchlists(db, 1002), []);
  assert.deepEqual(
    (await readWatchlists(db, 1001)).map((l) => l.id),
    ['owned']
  );
  assert.deepEqual(await readWatchlists(db, 999), []);
});
test('only members can create invites; raw tokens are not stored', async () => {
  await assert.rejects(issueInvite(db, 1002, 'owned'), AccessError);
  await assert.rejects(issueInvite(db, 1001, 'missing'), AccessError);
  const token = await issueInvite(db, 1001, 'owned');
  assert.match(token, /^i_[A-Za-z0-9_-]{43}$/);
  const invites = await db.collection('watchlistInvites').get();
  assert.equal(invites.size, 1);
  assert.equal(invites.docs[0].id, hash(token));
  assert.ok(!JSON.stringify(invites.docs[0].data()).includes(token));
  assert.ok(invites.docs[0].get('expiresAt').toMillis() > Date.now());
});
test('redeeming an invite atomically adds string membership and the reverse reference', async () => {
  const token = await issueInvite(db, 1001, 'owned');
  await redeemInvite(db, 1002, token);
  const user = (await db.doc('users/1002').get()).data();
  const list = (await db.doc('watchlists/owned').get()).data();
  assert.equal(user.userId, '1002');
  assert.deepEqual(user.watchlists, ['owned']);
  assert.deepEqual(list.userIds, ['1001', '1002']);
  assert.deepEqual(list.items, [{ id: 42, title: 'Example' }]);
});
test('retries and concurrent joins preserve both sides without duplicates', async () => {
  const token = await issueInvite(db, 1001, 'owned');
  await db
    .doc('users/1002')
    .set({ userId: 1002, watchlists: ['other'], extra: true });
  await Promise.all([
    redeemInvite(db, 1002, token),
    redeemInvite(db, 1002, token),
    redeemInvite(db, 1003, token),
  ]);
  const user = (await db.doc('users/1002').get()).data();
  assert.equal(user.userId, '1002');
  assert.equal(user.extra, true);
  assert.deepEqual(user.watchlists, ['other', 'owned']);
  assert.deepEqual(
    (await db.doc('watchlists/owned').get()).get('userIds').sort(),
    ['1001', '1002', '1003']
  );
});
test('rejects old raw-ID links, unknown tokens, and expired invitations without provisioning users', async () => {
  const token = await issueInvite(db, 1001, 'owned');
  await db
    .doc(`watchlistInvites/${hash(token)}`)
    .update({ expiresAt: Timestamp.fromMillis(1) });
  for (const bad of ['owned', `i_${'x'.repeat(43)}`, token])
    await assert.rejects(redeemInvite(db, 1002, bad), AccessError);
  assert.equal((await db.doc('users/1002').get()).exists, false);
  assert.deepEqual((await db.doc('watchlists/owned').get()).get('userIds'), [
    '1001',
  ]);
});
test('a deleted list or removed inviter invalidates an invite', async () => {
  const token = await issueInvite(db, 1001, 'owned');
  await db.doc('watchlists/owned').update({ userIds: ['1003'] });
  await assert.rejects(redeemInvite(db, 1002, token), AccessError);
  await db.doc('watchlists/owned').delete();
  await assert.rejects(redeemInvite(db, 1002, token), AccessError);
  assert.equal((await db.doc('users/1002').get()).exists, false);
});
test('malformed profiles cannot cause a partial membership grant', async () => {
  const token = await issueInvite(db, 1001, 'owned');
  await db.doc('users/1002').set({ userId: '999', watchlists: [] });
  await assert.rejects(redeemInvite(db, 1002, token), AccessError);
  assert.deepEqual((await db.doc('watchlists/owned').get()).get('userIds'), [
    '1001',
  ]);
});
