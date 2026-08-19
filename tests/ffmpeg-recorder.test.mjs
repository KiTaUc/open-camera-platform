import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import { FfmpegRecorder } from '../src/ffmpeg-recorder.mjs';

test('запускает локальный медиадвижок без shell-интерпретации', () => {
  const calls = [];
  const child = new EventEmitter(); child.kill = signal => calls.push(['kill', signal]);
  const recorder = new FfmpegRecorder({ spawn: (...args) => { calls.push(args); return child; } });
  const job = recorder.start({ cameraId: 'gate', rtspUrl: 'rtsp://192.168.1.50/live', archiveDirectory: '/srv/archive' });
  assert.equal(job.state, 'running');
  assert.equal(calls[0][0], 'ffmpeg');
  assert.equal(recorder.stop('gate').state, 'stopping');
});
