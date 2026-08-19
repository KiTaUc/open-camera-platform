import assert from 'node:assert/strict';
import test from 'node:test';
import { createUser, publicUser, verifyPassword } from '../src/user-registry.mjs';

test('создаёт локального пользователя без раскрытия пароля и проверяет вход', () => {
  const user = createUser({ login: 'camera_owner', password: 'длинный-надежный-пароль', role: 'owner' });
  assert.equal(verifyPassword(user, 'длинный-надежный-пароль'), true);
  assert.equal('passwordHash' in publicUser(user), false);
});
