import { randomBytes } from 'node:crypto';

export function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map(item => item.trim()).filter(Boolean).map(item => {
    const separator = item.indexOf('=');
    if (separator < 1) return [item, ''];
    try { return [item.slice(0, separator), decodeURIComponent(item.slice(separator + 1))]; }
    catch { return [item.slice(0, separator), '']; }
  }));
}

export function sessionCookie(token, { maxAgeSeconds = 28_800 } = {}) {
  return `ocp_session=${encodeURIComponent(token)}; Max-Age=${maxAgeSeconds}; Path=/; HttpOnly; SameSite=Strict`;
}

export class SessionStore {
  #sessions = new Map();
  #now;
  #ttlMs;

  constructor({ ttlMs = 28_800_000, now = () => Date.now() } = {}) {
    this.#ttlMs = ttlMs;
    this.#now = now;
  }

  create(user) {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = this.#now() + this.#ttlMs;
    this.#sessions.set(token, { userId: user.id, expiresAt });
    return { token, expiresAt };
  }

  get(token) {
    const session = this.#sessions.get(token);
    if (!session) return null;
    if (session.expiresAt <= this.#now()) {
      this.#sessions.delete(token);
      return null;
    }
    return { ...session };
  }

  revoke(token) { return this.#sessions.delete(token); }
}
