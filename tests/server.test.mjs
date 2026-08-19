import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from '../src/server.mjs';

test('добавляет камеру через локальный API и возвращает список', async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const created = await fetch(`${origin}/api/cameras`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Двор', mode: 'rtsp', address: 'rtsp://192.168.1.30/live' }) });
  assert.equal(created.status, 201);
  const list = await fetch(`${origin}/api/cameras`);
  assert.equal((await list.json()).length, 1);
  await new Promise(resolve => server.close(resolve));
});

test('отдаёт русскоязычную веб-панель', async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, resolve));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/`);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Открытая платформа камер/);
  await new Promise(resolve => server.close(resolve));
});

test('создаёт задания записи, сегменты архива и события через API', async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const post = (path, body) => fetch(`${origin}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  assert.equal((await post('/api/recordings', { cameraId: 'kitchen', rtspUrl: 'rtsp://192.168.1.40/live', archiveDirectory: '/srv/archive' })).status, 201);
  assert.equal((await post('/api/archive', { cameraId: 'kitchen', relativePath: 'kitchen/a.mp4', startedAt: '2026-08-19T10:00:00Z', endedAt: '2026-08-19T10:05:00Z' })).status, 201);
  assert.equal((await post('/api/events', { cameraId: 'kitchen', topic: 'MotionAlarm' })).status, 201);
  assert.equal((await (await fetch(`${origin}/api/events`)).json()).length, 1);
  await new Promise(resolve => server.close(resolve));
});
