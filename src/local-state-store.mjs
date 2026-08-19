import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const emptyState = () => ({ users: [], cameras: [], archive: [], events: [], notifications: [], snapshots: [], audit: [], recordingPolicies: [] });

function keyFrom(value) { return createHash('sha256').update(String(value)).digest(); }

function cleanList(value) { return Array.isArray(value) ? value : []; }

export class LocalStateStore {
  #directory;
  #statePath;
  #keyPath;
  #key;

  constructor({ directory = path.join(process.cwd(), 'data'), storageKey } = {}) {
    this.#directory = directory;
    this.#statePath = path.join(directory, 'platform-state.json');
    this.#keyPath = path.join(directory, 'platform-state.key');
    this.#key = storageKey ? keyFrom(storageKey) : null;
  }

  #getKey() {
    if (this.#key) return this.#key;
    mkdirSync(this.#directory, { recursive: true, mode: 0o700 });
    if (!existsSync(this.#keyPath)) {
      try { writeFileSync(this.#keyPath, randomBytes(32), { mode: 0o600, flag: 'wx' }); }
      catch (error) { if (error.code !== 'EEXIST') throw error; }
    }
    const key = readFileSync(this.#keyPath);
    if (key.length !== 32) throw new Error('Локальный ключ состояния имеет неверную длину');
    this.#key = key;
    return key;
  }

  #seal(secret) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.#getKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(secret), 'utf8'), cipher.final()]);
    return { v: 1, iv: iv.toString('base64url'), tag: cipher.getAuthTag().toString('base64url'), ciphertext: ciphertext.toString('base64url') };
  }

  #open(record) {
    if (!record || record.v !== 1 || !record.iv || !record.tag || !record.ciphertext) throw new Error('Некорректный зашифрованный реквизит камеры');
    try {
      const decipher = createDecipheriv('aes-256-gcm', this.#getKey(), Buffer.from(record.iv, 'base64url'));
      decipher.setAuthTag(Buffer.from(record.tag, 'base64url'));
      return JSON.parse(Buffer.concat([decipher.update(Buffer.from(record.ciphertext, 'base64url')), decipher.final()]).toString('utf8'));
    } catch { throw new Error('Не удалось расшифровать реквизиты камеры: проверьте ключ состояния'); }
  }

  load() {
    mkdirSync(this.#directory, { recursive: true, mode: 0o700 });
    if (!existsSync(this.#statePath)) return emptyState();
    let stored;
    try { stored = JSON.parse(readFileSync(this.#statePath, 'utf8')); }
    catch { throw new Error('Локальный файл состояния повреждён или содержит некорректный JSON'); }
    if (!stored || stored.version !== 1) throw new Error('Неподдерживаемая версия локального состояния');
    const secrets = stored.cameraSecrets && typeof stored.cameraSecrets === 'object' ? stored.cameraSecrets : {};
    return {
      users: cleanList(stored.users),
      cameras: cleanList(stored.cameras).map(camera => {
        const secret = secrets[camera.id] ? this.#open(secrets[camera.id]) : null;
        const credentials = secret?.credentials ?? secret;
        const profileCredentials = secret?.profileCredentials ?? {};
        return { ...camera, credentials: credentials ?? null, profiles: cleanList(camera.profiles).map(profile => ({ ...profile, credentials: profileCredentials[profile.id] ?? null })) };
      }),
      archive: cleanList(stored.archive),
      events: cleanList(stored.events),
      notifications: cleanList(stored.notifications),
      snapshots: cleanList(stored.snapshots),
      audit: cleanList(stored.audit),
      recordingPolicies: cleanList(stored.recordingPolicies),
    };
  }

  save(state) {
    mkdirSync(this.#directory, { recursive: true, mode: 0o700 });
    const cameraSecrets = {};
    const cameras = cleanList(state.cameras).map(camera => {
      const { credentials, profiles = [], ...publicCamera } = camera;
      const profileCredentials = {};
      const safeProfiles = cleanList(profiles).map(profile => {
        const { credentials: profileSecret, ...publicProfile } = profile;
        if (profileSecret?.username || profileSecret?.password) profileCredentials[profile.id] = profileSecret;
        return publicProfile;
      });
      if (credentials?.username || credentials?.password || Object.keys(profileCredentials).length) cameraSecrets[camera.id] = this.#seal({ credentials: credentials ?? null, profileCredentials });
      return { ...publicCamera, profiles: safeProfiles };
    });
    const payload = JSON.stringify({
      version: 1,
      users: cleanList(state.users), cameras, cameraSecrets,
      archive: cleanList(state.archive), events: cleanList(state.events), notifications: cleanList(state.notifications),
      snapshots: cleanList(state.snapshots), audit: cleanList(state.audit), recordingPolicies: cleanList(state.recordingPolicies),
    });
    const temporary = `${this.#statePath}.${process.pid}.tmp`;
    writeFileSync(temporary, payload, { mode: 0o600 });
    renameSync(temporary, this.#statePath);
  }
}
