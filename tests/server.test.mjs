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
