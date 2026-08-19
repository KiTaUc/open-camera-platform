import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { LocalStateStore } from '../src/local-state-store.mjs';

test('сохраняет реквизиты камеры только в зашифрованном поле и восстанавливает их локально', () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'ocp-state-'));
  try {
    const store = new LocalStateStore({ directory, storageKey: 'test-only-state-key' });
    store.save({ users: [{ id: 'owner', login: 'owner', passwordHash: 'hash', salt: 'salt' }], cameras: [{ id: 'cam-1', name: 'Склад', mode: 'rtsp', address: 'rtsp://192.168.1.20/live', credentials: { username: 'operator', password: 'secret' } }] });
    const raw = readFileSync(path.join(directory, 'platform-state.json'), 'utf8');
    assert.doesNotMatch(raw, /operator|secret/);
    const restored = store.load();
    assert.equal(restored.cameras[0].credentials.password, 'secret');
    assert.equal(restored.cameras[0].address, 'rtsp://192.168.1.20/live');
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
