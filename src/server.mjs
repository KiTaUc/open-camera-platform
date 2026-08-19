import http from 'node:http';
import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { createCamera } from './camera-registry.mjs';
import { dashboardHtml } from './dashboard.mjs';
import { discoverOnvif } from './onvif-discovery.mjs';
import { RecorderManager } from './recorder-manager.mjs';
import { FfmpegRecorder } from './ffmpeg-recorder.mjs';
import { LiveStreamer } from './live-streamer.mjs';
import { addSegment, selectExpiredSegments, summarizeStorage } from './archive-index.mjs';
import { appendEvent, normalizeCameraEvent } from './event-log.mjs';
import { createNotification } from './notification-center.mjs';
import { createUser, publicUser, verifyPassword } from './user-registry.mjs';
import { requirePermission } from './access-control.mjs';
import { SessionStore, parseCookies, sessionCookie } from './session-store.mjs';
import { appendAudit } from './audit-log.mjs';
import { SnapshotCapturer } from './snapshot-capture.mjs';

const defaultStreamDirectory = process.env.STREAM_DIRECTORY || path.join(process.cwd(), 'streams');
const defaultArchiveDirectory = process.env.ARCHIVE_DIRECTORY || path.join(process.cwd(), 'archive');
const defaultSnapshotDirectory = process.env.SNAPSHOT_DIRECTORY || path.join(process.cwd(), 'snapshots');
const sessionSeconds = 28_800;

function json(res, code, value, headers = {}) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', ...headers });
  res.end(JSON.stringify(value));
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 64 * 1024) throw new Error('Тело запроса превышает 64 КБ');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new Error('Ожидается корректный JSON'); }
}

function safeRelativePath(relativePath) {
  return relativePath && !relativePath.includes('..') && !path.isAbsolute(relativePath);
}

export function createServer({
  streamDirectory = defaultStreamDirectory,
  archiveDirectory = defaultArchiveDirectory,
  snapshotDirectory = defaultSnapshotDirectory,
  initialUsers = [],
  sessions = new SessionStore(),
  snapshotCapturer = new SnapshotCapturer(),
} = {}) {
  const cameras = [];
  const recorderManager = process.env.NODE_ENV === 'test' ? new RecorderManager() : new FfmpegRecorder();
  const liveStreamer = new LiveStreamer();
  const users = [...initialUsers];
  let archive = [];
  let events = [];
  let notifications = [];
  let snapshots = [];
  let audit = [];

  const recordAudit = (user, action, targetType, targetId) => { audit = appendAudit(audit, { actorId: user.id, action, targetType, targetId }); };
  const findAccess = (req, permission) => {
    const token = parseCookies(req.headers.cookie).ocp_session;
    const session = sessions.get(token);
    const user = session && users.find(candidate => candidate.id === session.userId);
    if (!user) return { code: 401, error: 'Требуется вход в локальную панель' };
    try { requirePermission(user.role, permission); }
    catch { return { code: 403, error: 'Недостаточно прав для этого действия' }; }
    return { user, token };
  };
  const authorize = (req, res, permission) => {
    const access = findAccess(req, permission);
    if (!access.user) { json(res, access.code, { error: access.error }); return null; }
    return access;
  };

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const pathname = url.pathname;
    if (req.method === 'GET' && pathname === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      return res.end(dashboardHtml);
    }
    if (req.method === 'GET' && pathname.startsWith('/streams/')) {
      const access = authorize(req, res, 'live:view'); if (!access) return;
      const relativePath = decodeURIComponent(pathname.slice('/streams/'.length));
      if (!safeRelativePath(relativePath)) return json(res, 400, { error: 'Некорректный путь потока' });
      try {
        const content = await readFile(path.join(streamDirectory, relativePath));
        const contentType = relativePath.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/mp2t';
        res.writeHead(200, { 'content-type': contentType, 'cache-control': 'no-store' });
        return res.end(content);
      } catch { return json(res, 404, { error: 'Сегмент живого потока не найден' }); }
    }
    if (req.method === 'GET' && pathname.startsWith('/snapshots/')) {
      const access = authorize(req, res, 'snapshot:view'); if (!access) return;
      const relativePath = decodeURIComponent(pathname.slice('/snapshots/'.length));
      if (!safeRelativePath(relativePath)) return json(res, 400, { error: 'Некорректный путь снимка' });
      try {
        const content = await readFile(path.join(snapshotDirectory, relativePath));
        res.writeHead(200, { 'content-type': 'image/jpeg', 'cache-control': 'no-store' });
        return res.end(content);
      } catch { return json(res, 404, { error: 'Снимок не найден' }); }
    }
    if (req.method === 'GET' && pathname === '/api/session') {
      const access = findAccess(req, 'camera:view');
      return json(res, 200, access.user ? { authenticated: true, user: publicUser(access.user), setupRequired: false } : { authenticated: false, setupRequired: users.length === 0 });
    }
    if (req.method === 'POST' && pathname === '/api/setup') {
      if (users.length) return json(res, 409, { error: 'Первый владелец уже создан' });
      try {
        const user = createUser({ ...(await readJson(req)), role: 'owner' });
        users.push(user);
        const session = sessions.create(user);
        recordAudit(user, 'user.setup', 'user', user.id);
        return json(res, 201, { user: publicUser(user) }, { 'set-cookie': sessionCookie(session.token, { maxAgeSeconds: sessionSeconds }) });
      } catch (error) { return json(res, 400, { error: error.message }); }
    }
    if (req.method === 'POST' && pathname === '/api/login') {
      try {
        const { login, password } = await readJson(req);
        const user = users.find(candidate => candidate.login === login);
        if (!user || !verifyPassword(user, password || '')) return json(res, 401, { error: 'Неверный логин или пароль' });
        const session = sessions.create(user);
        recordAudit(user, 'session.login', 'session', user.id);
        return json(res, 200, { user: publicUser(user) }, { 'set-cookie': sessionCookie(session.token, { maxAgeSeconds: sessionSeconds }) });
      } catch (error) { return json(res, 400, { error: error.message }); }
    }
    if (req.method === 'POST' && pathname === '/api/logout') {
      const access = authorize(req, res, 'camera:view'); if (!access) return;
      sessions.revoke(access.token);
      recordAudit(access.user, 'session.logout', 'session', access.user.id);
      return json(res, 200, { ok: true }, { 'set-cookie': sessionCookie('', { maxAgeSeconds: 0 }) });
    }
    if (req.method === 'GET' && pathname === '/api/users') {
      const access = authorize(req, res, 'user:manage'); if (!access) return;
      return json(res, 200, users.map(publicUser));
    }
    if (req.method === 'POST' && pathname === '/api/users') {
      const access = authorize(req, res, 'user:manage'); if (!access) return;
      try {
        const user = createUser(await readJson(req));
        if (users.some(candidate => candidate.login === user.login)) throw new Error('Такой логин уже существует');
        users.push(user);
        recordAudit(access.user, 'user.create', 'user', user.id);
        return json(res, 201, publicUser(user));
      } catch (error) { return json(res, 400, { error: error.message }); }
    }
    if (req.method === 'GET' && pathname === '/api/cameras') { const access = authorize(req, res, 'camera:view'); if (access) return json(res, 200, cameras); return; }
    if (req.method === 'GET' && pathname === '/api/recordings') { const access = authorize(req, res, 'archive:view'); if (access) return json(res, 200, recorderManager.list()); return; }
    if (req.method === 'GET' && pathname === '/api/live-streams') { const access = authorize(req, res, 'live:view'); if (access) return json(res, 200, liveStreamer.list()); return; }
    if (req.method === 'GET' && pathname === '/api/archive') { const access = authorize(req, res, 'archive:view'); if (access) return json(res, 200, archive); return; }
    if (req.method === 'GET' && pathname === '/api/archive/usage') { const access = authorize(req, res, 'archive:view'); if (access) return json(res, 200, summarizeStorage(archive)); return; }
    if (req.method === 'GET' && pathname === '/api/events') { const access = authorize(req, res, 'event:view'); if (access) return json(res, 200, events); return; }
    if (req.method === 'GET' && pathname === '/api/notifications') { const access = authorize(req, res, 'notification:view'); if (access) return json(res, 200, notifications); return; }
    if (req.method === 'GET' && pathname === '/api/snapshots') { const access = authorize(req, res, 'snapshot:view'); if (access) return json(res, 200, snapshots.map(snapshot => ({ ...snapshot, url: `/snapshots/${snapshot.relativePath}` }))); return; }
    if (req.method === 'GET' && pathname === '/api/audit') { const access = authorize(req, res, 'audit:view'); if (access) return json(res, 200, audit); return; }
    if (req.method === 'POST' && pathname === '/api/discovery') {
      const access = authorize(req, res, 'camera:manage'); if (!access) return;
      try { return json(res, 200, { addresses: await discoverOnvif() }); }
      catch { return json(res, 500, { error: 'Не удалось выполнить поиск ONVIF-камер' }); }
    }
    if (req.method === 'POST' && pathname === '/api/recordings') {
      const access = authorize(req, res, 'recording:manage'); if (!access) return;
      try { const job = recorderManager.start(await readJson(req)); recordAudit(access.user, 'recording.start', 'camera', job.cameraId); return json(res, 201, job); }
      catch (error) { return json(res, 400, { error: error.message }); }
    }
    if (req.method === 'POST' && pathname === '/api/live-streams') {
      const access = authorize(req, res, 'camera:manage'); if (!access) return;
      try { const stream = liveStreamer.start({ ...(await readJson(req)), streamDirectory }); recordAudit(access.user, 'live.start', 'camera', stream.cameraId); return json(res, 201, stream); }
      catch (error) { return json(res, 400, { error: error.message }); }
    }
    if (req.method === 'POST' && pathname === '/api/archive') {
      const access = authorize(req, res, 'recording:manage'); if (!access) return;
      try {
        const input = await readJson(req);
        archive = addSegment(archive, input);
        const segment = archive.find(candidate => candidate.cameraId === input.cameraId && candidate.relativePath === input.relativePath && candidate.startedAt === new Date(input.startedAt).toISOString());
        recordAudit(access.user, 'archive.index', 'segment', segment.relativePath);
        return json(res, 201, segment);
      }
      catch (error) { return json(res, 400, { error: error.message }); }
    }
    if (req.method === 'POST' && pathname === '/api/archive/retention') {
      const access = authorize(req, res, 'archive:manage'); if (!access) return;
      try {
        const policy = await readJson(req);
        if (policy.confirm !== true) throw new Error('Для очистки архива требуется явное подтверждение');
        const expired = selectExpiredSegments(archive, { before: policy.before, maxBytes: policy.maxBytes ?? Infinity });
        for (const segment of expired) if (safeRelativePath(segment.relativePath)) await rm(path.join(archiveDirectory, segment.relativePath), { force: true });
        const removed = new Set(expired.map(segment => `${segment.cameraId}:${segment.relativePath}:${segment.startedAt}`));
        archive = archive.filter(segment => !removed.has(`${segment.cameraId}:${segment.relativePath}:${segment.startedAt}`));
        recordAudit(access.user, 'archive.retention', 'archive', String(expired.length));
        return json(res, 200, { removed: expired.length, storage: summarizeStorage(archive) });
      } catch (error) { return json(res, 400, { error: error.message }); }
    }
    if (req.method === 'POST' && pathname === '/api/events') {
      const access = authorize(req, res, 'recording:manage'); if (!access) return;
      try {
        const payload = await readJson(req);
        const event = normalizeCameraEvent(payload);
        events = appendEvent(events, event);
        if (payload.recipientId) notifications = [createNotification(event, { recipientId: payload.recipientId }), ...notifications];
        recordAudit(access.user, 'event.ingest', 'camera', event.cameraId);
        return json(res, 201, event);
      } catch (error) { return json(res, 400, { error: error.message }); }
    }
    if (req.method === 'POST' && pathname === '/api/cameras') {
      const access = authorize(req, res, 'camera:manage'); if (!access) return;
      try {
        const camera = createCamera(await readJson(req));
        cameras.push(camera);
        recordAudit(access.user, 'camera.create', 'camera', camera.id);
        return json(res, 201, camera);
      } catch (error) { return json(res, 400, { error: error.message }); }
    }
    const snapshotMatch = pathname.match(/^\/api\/cameras\/([a-zA-Z0-9_-]+)\/snapshot$/);
    if (req.method === 'POST' && snapshotMatch) {
      const access = authorize(req, res, 'snapshot:capture'); if (!access) return;
      const camera = cameras.find(candidate => candidate.id === snapshotMatch[1]);
      if (!camera) return json(res, 404, { error: 'Камера не найдена' });
      try {
        const snapshot = await snapshotCapturer.capture({ cameraId: camera.id, rtspUrl: camera.address, snapshotDirectory });
        snapshots = [snapshot, ...snapshots];
        recordAudit(access.user, 'snapshot.capture', 'camera', camera.id);
        return json(res, 201, { ...snapshot, url: `/snapshots/${snapshot.relativePath}` });
      } catch (error) { return json(res, 400, { error: error.message }); }
    }
    return json(res, 404, { error: 'Маршрут не найден' });
  });
}

if (process.env.NODE_ENV !== 'test') {
  createServer().listen(process.env.PORT || 8787, () => console.log('Локальная панель камер запущена'));
}
