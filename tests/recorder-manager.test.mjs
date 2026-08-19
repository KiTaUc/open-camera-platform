import assert from 'node:assert/strict';
import test from 'node:test';
import { RecorderManager } from '../src/recorder-manager.mjs';

const input = { cameraId: 'entrance', rtspUrl: 'rtsp://192.168.1.44/live', archiveDirectory: '/srv/archive' };

test('создаёт и запускает задание локальной записи', () => {
  const manager = new RecorderManager();
  assert.equal(manager.start(input).state, 'starting');
  assert.equal(manager.markRunning('entrance').state, 'running');
  assert.equal(manager.list().length, 1);
});

test('не запускает две записи одной камеры', () => {
  const manager = new RecorderManager();
  manager.start(input);
  assert.throws(() => manager.start(input));
});
