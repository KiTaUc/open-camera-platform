import assert from 'node:assert/strict';
import test from 'node:test';
import { SessionStore, parseCookies, sessionCookie } from '../src/session-store.mjs';

test('создаёт и отзывает локальную сессию с криптостойким токеном', () => {
  const sessions = new SessionStore({ now: () => 1_000 });
  const created = sessions.create({ id: 'owner-1' });
  assert.equal(created.token.length > 30, true);
  assert.equal(sessions.get(created.token).userId, 'owner-1');
  assert.equal(sessions.revoke(created.token), true);
  assert.equal(sessions.get(created.token), null);
});

test('не возвращает истёкшую сессию и корректно разбирает cookie', () => {
  let now = 1_000;
  const sessions = new SessionStore({ ttlMs: 5, now: () => now });
  const created = sessions.create({ id: 'viewer-1' });
  now = 1_005;
  assert.equal(sessions.get(created.token), null);
  assert.deepEqual(parseCookies('theme=night; ocp_session=token-value'), { theme: 'night', ocp_session: 'token-value' });
  assert.match(sessionCookie('token-value'), /HttpOnly/);
  assert.match(sessionCookie('token-value'), /SameSite=Strict/);
});
