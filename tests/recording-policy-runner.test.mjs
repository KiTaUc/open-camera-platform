import assert from 'node:assert/strict';
import test from 'node:test';
import { RecorderManager } from '../src/recorder-manager.mjs';
import { RecordingPolicyRunner } from '../src/recording-policy-runner.mjs';

function setup() {
  const cameras = [{ id: 'front', address: 'rtsp://192.168.1.80/live' }];
  const recorder = new RecorderManager();
  return { recorder, runner: new RecordingPolicyRunner({ recorder, getCamera: id => cameras.find(camera => camera.id === id), archiveDirectory: '/srv/archive' }) };
}

test('непрерывная политика запускает рекордер один раз', () => {
  const { recorder, runner } = setup();
  runner.configure({ cameraId: 'front', mode: 'continuous' });
  assert.deepEqual(runner.evaluate({ now: new Date('2026-08-19T12:00:00Z') }), [{ cameraId: 'front', action: 'started', trigger: 'continuous' }]);
  assert.equal(recorder.list().length, 1);
  assert.deepEqual(runner.evaluate({ now: new Date('2026-08-19T12:01:00Z') }), []);
});

test('плановая политика запускает запись внутри окна и останавливает вне окна', () => {
  const { recorder, runner } = setup();
  runner.configure({ cameraId: 'front', mode: 'schedule', start: '10:00', end: '11:00' });
  assert.equal(runner.evaluate({ now: new Date('2026-08-19T10:30:00Z') })[0].action, 'started');
  assert.equal(recorder.list().length, 1);
  assert.equal(runner.evaluate({ now: new Date('2026-08-19T11:00:00Z') })[0].action, 'stopped');
  assert.equal(recorder.list().length, 0);
});

test('событийная политика запускает запись по событию и завершает её после окна', () => {
  const { recorder, runner } = setup();
  runner.configure({ cameraId: 'front', mode: 'event', postEventSeconds: 30 });
  const started = runner.onEvent({ cameraId: 'front' }, { now: new Date('2026-08-19T12:00:00Z') });
  assert.equal(started.action, 'started');
  assert.equal(recorder.list().length, 1);
  assert.equal(runner.evaluate({ now: new Date('2026-08-19T12:00:30Z') })[0].action, 'stopped');
  assert.equal(recorder.list().length, 0);
});
