import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import { LiveStreamer, createLiveStreamPlan } from '../src/live-streamer.mjs';

test('создаёт HLS-план выбранного профиля локальной RTSP-камеры', () => {
  const plan = createLiveStreamPlan({ cameraId: 'hall', streamId: 'hall-sub', rtspUrl: 'rtsp://192.168.1.60/live', streamDirectory: '/srv/streams' });
  assert.match(plan.playlist, /hall-sub\/index\.m3u8$/);
  assert.ok(plan.arguments.includes('hls'));
});

test('запускает HLS-поток без shell-интерпретации', () => {
  const child = new EventEmitter(); child.kill = () => {};
  const streamer = new LiveStreamer({ spawn: () => child });
  const stream = streamer.start({ cameraId: 'hall', profileId: 'sub', streamId: 'hall-sub', rtspUrl: 'rtsp://192.168.1.60/live', streamDirectory: '/srv/streams' });
  assert.equal(stream.state, 'running');
  assert.deepEqual(streamer.list().map(item => ({ streamId: item.streamId, profileId: item.profileId })), [{ streamId: 'hall-sub', profileId: 'sub' }]);
});
