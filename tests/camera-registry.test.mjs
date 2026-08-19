import assert from 'node:assert/strict';
import test from 'node:test';
import { cameraConnectionUrl, createArchiveSegment, createCamera, publicCamera, validateCameraInput } from '../src/camera-registry.mjs';

test('добавляет RTSP-камеру из локальной сети', () => {
  const camera = createCamera({ name: 'Вход', mode: 'rtsp', address: 'rtsp://192.168.1.25:554/live' }, new Date('2026-08-19T10:00:00Z'));
  assert.equal(camera.name, 'Вход');
  assert.equal(camera.status, 'new');
});

test('не принимает внешний адрес без явного разрешения', () => {
  assert.throws(() => validateCameraInput({ name: 'Камера', mode: 'rtsp', address: 'rtsp://8.8.8.8/live' }));
});

test('не принимает небезопасный путь архива', () => {
  assert.throws(() => createArchiveSegment('cam', '2026-08-19T10:00:00Z', '2026-08-19T10:01:00Z', '../video.mp4'));
});

test('отделяет реквизиты RTSP от публичной модели камеры', () => {
  const camera = createCamera({ name: 'Склад', mode: 'rtsp', address: 'rtsp://operator:secret@192.168.1.27/live' });
  assert.equal(camera.address, 'rtsp://192.168.1.27/live');
  assert.equal(publicCamera(camera).credentials, undefined);
  assert.equal(cameraConnectionUrl(camera), 'rtsp://operator:secret@192.168.1.27/live');
});
