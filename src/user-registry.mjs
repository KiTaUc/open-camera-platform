import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export function createUser({ login, password, role = 'viewer' }) {
  if (!/^[a-zA-Z0-9._-]{3,64}$/.test(login || '')) throw new Error('Логин должен содержать от 3 до 64 допустимых символов');
  if (typeof password !== 'string' || password.length < 12) throw new Error('Пароль должен содержать не менее 12 символов');
  if (!['owner', 'admin', 'viewer'].includes(role)) throw new Error('Некорректная роль пользователя');
  const salt = randomBytes(16).toString('hex');
  return { id: crypto.randomUUID(), login, role, passwordHash: scryptSync(password, salt, 64).toString('hex'), salt, createdAt: new Date().toISOString() };
}

export function verifyPassword(user, password) {
  const candidate = scryptSync(password, user.salt, 64);
  return timingSafeEqual(candidate, Buffer.from(user.passwordHash, 'hex'));
}

export function publicUser(user) { return { id: user.id, login: user.login, role: user.role, createdAt: user.createdAt }; }
