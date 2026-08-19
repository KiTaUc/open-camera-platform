import assert from 'node:assert/strict';
import test from 'node:test';
import { createRecordingPlan } from '../src/recording-plan.mjs';

test('создаёт план локальной сегментной записи RTSP-потока', () => {
  const plan = createRecordingPlan({ cameraId: 'yard_1', rtspUrl: 'rtsp://192.168.1.30/live', archiveDirectory: '/srv/camera-archive' });
  assert.equal(plan.executable, 'ffmpeg');
  assert.match(plan.output, /yard_1/);
});

test('отклоняет не-RTSP адрес для записи', () => {
  assert.throws(() => createRecordingPlan({ cameraId: 'yard', rtspUrl: 'https://example.test/live', archiveDirectory: '/srv/archive' }));
});
