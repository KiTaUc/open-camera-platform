import assert from 'node:assert/strict';
import test from 'node:test';
import { createSnapshotPlan, SnapshotCapturer } from '../src/snapshot-capture.mjs';

test('создаёт безопасный план единичного RTSP-снимка без shell-команды', () => {
  const plan = createSnapshotPlan({ cameraId: 'front_1', rtspUrl: 'rtsp://192.168.1.50/live', snapshotDirectory: '/srv/snapshots', capturedAt: '2026-08-19T12:00:00Z' });
  assert.equal(plan.executable, 'ffmpeg');
  assert.equal(plan.arguments.includes('rtsp://192.168.1.50/live'), true);
  assert.equal(plan.arguments.some(value => value.includes(';')), false);
  assert.match(plan.relativePath, /^front_1\/.+\.jpg$/);
});

test('тестовый захватчик возвращает метаданные снимка без запуска медиапроцесса', async () => {
  const capture = new SnapshotCapturer({ spawn: null, now: () => new Date('2026-08-19T12:00:00Z') });
  const result = await capture.capture({ cameraId: 'front', rtspUrl: 'rtsp://192.168.1.50/live', snapshotDirectory: '/srv/snapshots' });
  assert.equal(result.state, 'captured');
  assert.equal(result.bytes, 0);
});
