import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import { LiveStreamer, createLiveStreamPlan } from '../src/live-streamer.mjs';

test('создаёт HLS-план для живого просмотра локальной RTSP-камеры', () => {
  const plan = createLiveStreamPlan({ cameraId: 'hall', rtspUrl: 'rtsp://192.168.1.60/live', streamDirectory: '/srv/streams' });
  assert.match(plan.playlist, /hall\/index\.m3u8$/);
  assert.ok(plan.arguments.includes('hls'));
});

test('запускает HLS-поток без shell-интерпретации', () => {
  const child = new EventEmitter(); child.kill = () => {};
  const streamer = new LiveStreamer({ spawn: () => child });
  assert.equal(streamer.start({ cameraId: 'hall', rtspUrl: 'rtsp://192.168.1.60/live', streamDirectory: '/srv/streams' }).state, 'running');
  assert.equal(streamer.list().length, 1);
});
