import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createServer } from '../src/server.mjs';
import { LocalStateStore } from '../src/local-state-store.mjs';

async function startServer(options = {}) {
  const server = createServer({ snapshotCapturer: { capture: async ({ cameraId }) => ({ cameraId, relativePath: `${cameraId}/fixed.jpg`, capturedAt: '2026-08-19T12:00:00Z', bytes: 123, state: 'captured' }) }, ...options });
  await new Promise(resolve => server.listen(0, resolve));
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}

async function setupOwner(origin) {
  const response = await fetch(`${origin}/api/setup`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ login: 'owner', password: 'long-safe-owner-password' }) });
  assert.equal(response.status, 201);
  return response.headers.get('set-cookie').split(';')[0];
}

function post(origin, pathname, body, cookie) {
  return fetch(`${origin}${pathname}`, { method: 'POST', headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) });
}

async function close(server) { await new Promise(resolve => server.close(resolve)); }

test('не раскрывает данные камер до входа и отдаёт русскоязычную панель', async () => {
  const { server, origin } = await startServer();
  assert.equal((await fetch(`${origin}/api/cameras`)).status, 401);
  const response = await fetch(`${origin}/`);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Открытая платформа камер/);
  assert.match(html, /Проверить состояние/);
  assert.match(html, /Подготовка локального экспорта/);
  await close(server);
});

test('первый владелец создаёт сессию и добавляет камеру через защищённый API', async () => {
  const { server, origin } = await startServer();
  const cookie = await setupOwner(origin);
  const created = await post(origin, '/api/cameras', { name: 'Двор', mode: 'rtsp', address: 'rtsp://192.168.1.30/live' }, cookie);
  assert.equal(created.status, 201);
  const list = await fetch(`${origin}/api/cameras`, { headers: { cookie } });
  assert.equal((await list.json()).length, 1);
  const session = await fetch(`${origin}/api/session`, { headers: { cookie } });
  assert.equal((await session.json()).user.role, 'owner');
  await close(server);
});

test('роль viewer видит камеры, но не может менять конфигурацию', async () => {
  const { server, origin } = await startServer();
  const ownerCookie = await setupOwner(origin);
  assert.equal((await post(origin, '/api/users', { login: 'viewer', password: 'long-safe-viewer-password', role: 'viewer' }, ownerCookie)).status, 201);
  const login = await post(origin, '/api/login', { login: 'viewer', password: 'long-safe-viewer-password' });
  const viewerCookie = login.headers.get('set-cookie').split(';')[0];
  assert.equal((await fetch(`${origin}/api/cameras`, { headers: { cookie: viewerCookie } })).status, 200);
  assert.equal((await post(origin, '/api/cameras', { name: 'Гараж', mode: 'rtsp', address: 'rtsp://192.168.1.31/live' }, viewerCookie)).status, 403);
  await close(server);
});

test('показывает проверенный локальный статус камеры и защищает запуск проверки', async () => {
  const { server, origin } = await startServer({ healthProbe: async () => ({ state: 'degraded', detail: 'Высокая задержка' }) });
  const cookie = await setupOwner(origin);
  const camera = await post(origin, '/api/cameras', { name: 'Вход', mode: 'rtsp', address: 'rtsp://192.168.1.55/live' }, cookie);
  const cameraId = (await camera.json()).id;
  assert.equal((await post(origin, '/api/health/evaluate', {}, cookie)).status, 200);
  const health = await (await fetch(`${origin}/api/health`, { headers: { cookie } })).json();
  assert.equal(health[0].cameraId, cameraId);
  assert.equal(health[0].state, 'degraded');
  assert.equal((await post(origin, '/api/health/evaluate', {}, '')).status, 401);
  await close(server);
});

test('создаёт записи, архив, события и уведомления от имени владельца', async () => {
  const { server, origin } = await startServer();
  const cookie = await setupOwner(origin);
  assert.equal((await post(origin, '/api/recordings', { cameraId: 'kitchen', rtspUrl: 'rtsp://192.168.1.40/live', archiveDirectory: '/srv/archive' }, cookie)).status, 201);
  const indexed = await post(origin, '/api/archive', { cameraId: 'kitchen', relativePath: 'kitchen/a.mp4', startedAt: '2026-08-19T10:00:00Z', endedAt: '2026-08-19T10:05:00Z', bytes: 40 }, cookie);
  assert.equal(indexed.status, 201);
  assert.equal((await indexed.json()).relativePath, 'kitchen/a.mp4');
  assert.equal((await post(origin, '/api/events', { cameraId: 'kitchen', topic: 'MotionAlarm', recipientId: 'owner' }, cookie)).status, 201);
  assert.equal((await (await fetch(`${origin}/api/events`, { headers: { cookie } })).json()).length, 1);
  const notifications = await (await fetch(`${origin}/api/notifications`, { headers: { cookie } })).json();
  assert.equal(notifications.length, 1);
  const read = await post(origin, `/api/notifications/${notifications[0].id}/read`, {}, cookie);
  assert.equal((await read.json()).readAt !== null, true);
  assert.equal((await (await fetch(`${origin}/api/archive/usage`, { headers: { cookie } })).json()).bytes, 40);
  const search = await fetch(`${origin}/api/archive/search?cameraId=kitchen&from=2026-08-19T10%3A02%3A00Z&to=2026-08-19T10%3A04%3A00Z`, { headers: { cookie } });
  assert.equal(search.status, 200);
  assert.equal((await search.json()).segments.length, 1);
  assert.equal((await fetch(`${origin}/api/archive/search`, { headers: { cookie: '' } })).status, 401);
  const exported = await post(origin, '/api/archive/exports', { cameraId: 'kitchen', from: '2026-08-19T09:59:00Z', to: '2026-08-19T10:06:00Z' }, cookie);
  assert.equal(exported.status, 201);
  assert.equal((await exported.json()).segments.length, 1);
  await close(server);
});

test('запускает HLS, фиксирует снимок, применяет хранение с подтверждением и ведёт аудит', async () => {
  const { server, origin } = await startServer();
  const cookie = await setupOwner(origin);
  const camera = await post(origin, '/api/cameras', { name: 'Гараж', mode: 'rtsp', address: 'rtsp://192.168.1.70/live', profiles: [{ id: 'main', label: 'Основной', address: 'rtsp://192.168.1.70/live' }, { id: 'sub', label: 'Экономичный', address: 'rtsp://192.168.1.70/sub' }] }, cookie);
  const cameraId = (await camera.json()).id;
  const live = await post(origin, '/api/live-streams', { cameraId, profileId: 'sub' }, cookie);
  assert.equal(live.status, 201);
  assert.equal((await live.json()).profileId, 'sub');
  assert.equal((await post(origin, '/api/live-streams', { cameraId, profileId: 'missing' }, cookie)).status, 400);
  const snapshot = await post(origin, `/api/cameras/${cameraId}/snapshot`, { profileId: 'sub' }, cookie);
  assert.equal(snapshot.status, 201);
  assert.match((await snapshot.json()).url, /^\/snapshots\//);
  await post(origin, '/api/archive', { cameraId, relativePath: 'garage/a.mp4', startedAt: '2026-07-01T10:00:00Z', endedAt: '2026-07-01T10:05:00Z', bytes: 30 }, cookie);
  assert.equal((await post(origin, '/api/archive/retention', { before: '2026-08-01T00:00:00Z', confirm: false }, cookie)).status, 400);
  const retention = await post(origin, '/api/archive/retention', { before: '2026-08-01T00:00:00Z', confirm: true }, cookie);
  assert.equal((await retention.json()).removed, 1);
  const audit = await fetch(`${origin}/api/audit`, { headers: { cookie } });
  const auditEntries = await audit.json();
  assert.equal(auditEntries.some(entry => entry.action === 'snapshot.capture' && entry.targetId === `${cameraId}:sub`), true);
  await close(server);
});

test('настраивает непрерывную и событийную политику записи через защищённый API', async () => {
  const { server, origin } = await startServer();
  const cookie = await setupOwner(origin);
  const camera = await post(origin, '/api/cameras', { name: 'Прихожая', mode: 'rtsp', address: 'rtsp://192.168.1.81/live' }, cookie);
  const cameraId = (await camera.json()).id;
  const continuous = await post(origin, '/api/recording-policies', { cameraId, mode: 'continuous' }, cookie);
  assert.equal(continuous.status, 201);
  assert.equal((await (await fetch(`${origin}/api/recordings`, { headers: { cookie } })).json()).length, 1);
  const policy = await post(origin, '/api/recording-policies', { cameraId, mode: 'event', postEventSeconds: 30 }, cookie);
  assert.equal(policy.status, 201);
  const event = await post(origin, '/api/events', { cameraId, topic: 'MotionAlarm' }, cookie);
  assert.equal((await event.json()).recording.action, 'started');
  const list = await fetch(`${origin}/api/recording-policies`, { headers: { cookie } });
  assert.equal((await list.json())[0].mode, 'event');
  await close(server);
});

test('восстанавливает локальных пользователей и камеры после перезапуска, не выдавая реквизиты в API', async () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'ocp-server-state-'));
  try {
    const stateStore = new LocalStateStore({ directory, storageKey: 'server-test-state-key' });
    const first = createServer({ stateStore, snapshotCapturer: { capture: async () => ({}) } });
    await new Promise(resolve => first.listen(0, resolve));
    const firstOrigin = `http://127.0.0.1:${first.address().port}`;
    const cookie = await setupOwner(firstOrigin);
    const camera = await post(firstOrigin, '/api/cameras', { name: 'Вход', mode: 'rtsp', address: 'rtsp://operator:secret@192.168.1.90/live' }, cookie);
    assert.equal(camera.status, 201);
    await close(first);
    assert.doesNotMatch(readFileSync(path.join(directory, 'platform-state.json'), 'utf8'), /operator|secret/);
    const second = createServer({ stateStore, snapshotCapturer: { capture: async () => ({}) } });
    await new Promise(resolve => second.listen(0, resolve));
    const secondOrigin = `http://127.0.0.1:${second.address().port}`;
    const login = await post(secondOrigin, '/api/login', { login: 'owner', password: 'long-safe-owner-password' });
    const newCookie = login.headers.get('set-cookie').split(';')[0];
    const cameras = await (await fetch(`${secondOrigin}/api/cameras`, { headers: { cookie: newCookie } })).json();
    assert.equal(cameras.length, 1);
    assert.equal(cameras[0].address, 'rtsp://192.168.1.90/live');
    assert.equal(cameras[0].credentials, undefined);
    await close(second);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
