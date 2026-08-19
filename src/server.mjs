import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createCamera } from './camera-registry.mjs';
import { dashboardHtml } from './dashboard.mjs';
import { discoverOnvif } from './onvif-discovery.mjs';
import { RecorderManager } from './recorder-manager.mjs';
import { FfmpegRecorder } from './ffmpeg-recorder.mjs';
import { LiveStreamer } from './live-streamer.mjs';
import { addSegment } from './archive-index.mjs';
import { appendEvent, normalizeCameraEvent } from './event-log.mjs';

const cameras = [];
const recorderManager = process.env.NODE_ENV === 'test' ? new RecorderManager() : new FfmpegRecorder();
const liveStreamer = new LiveStreamer();
const streamDirectory = process.env.STREAM_DIRECTORY || path.join(process.cwd(), 'streams');
let archive = [];
let events = [];

function json(res, code, value) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(value));
}

export function createServer() {
  return http.createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(dashboardHtml);
    }
    if (req.method === 'GET' && req.url?.startsWith('/streams/')) {
      const relativePath = decodeURIComponent(req.url.slice('/streams/'.length));
      if (!relativePath || relativePath.includes('..') || path.isAbsolute(relativePath)) return json(res, 400, { error: 'Некорректный путь потока' });
      try {
        const content = await readFile(path.join(streamDirectory, relativePath));
        const contentType = relativePath.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/mp2t';
        res.writeHead(200, { 'content-type': contentType, 'cache-control': 'no-store' });
        return res.end(content);
      } catch { return json(res, 404, { error: 'Сегмент живого потока не найден' }); }
    }
    if (req.method === 'GET' && req.url === '/api/cameras') return json(res, 200, cameras);
    if (req.method === 'GET' && req.url === '/api/recordings') return json(res, 200, recorderManager.list());
    if (req.method === 'GET' && req.url === '/api/live-streams') return json(res, 200, liveStreamer.list());
    if (req.method === 'GET' && req.url === '/api/archive') return json(res, 200, archive);
    if (req.method === 'GET' && req.url === '/api/events') return json(res, 200, events);
    if (req.method === 'POST' && req.url === '/api/discovery') {
      try { return json(res, 200, { addresses: await discoverOnvif() }); }
      catch (error) { return json(res, 500, { error: 'Не удалось выполнить поиск ONVIF-камер' }); }
    }
    if (req.method === 'POST' && req.url === '/api/recordings') {
      let body = '';
      for await (const chunk of req) body += chunk;
      try { return json(res, 201, recorderManager.start(JSON.parse(body))); }
      catch (error) { return json(res, 400, { error: error instanceof Error ? error.message : 'Не удалось создать запись' }); }
    }
    if (req.method === 'POST' && req.url === '/api/live-streams') {
      let body = '';
      for await (const chunk of req) body += chunk;
      try { return json(res, 201, liveStreamer.start({ ...JSON.parse(body), streamDirectory })); }
      catch (error) { return json(res, 400, { error: error instanceof Error ? error.message : 'Не удалось запустить живой поток' }); }
    }
    if (req.method === 'POST' && req.url === '/api/archive') {
      let body = '';
      for await (const chunk of req) body += chunk;
      try { archive = addSegment(archive, JSON.parse(body)); return json(res, 201, archive.at(-1)); }
      catch (error) { return json(res, 400, { error: error instanceof Error ? error.message : 'Не удалось добавить сегмент' }); }
    }
    if (req.method === 'POST' && req.url === '/api/events') {
      let body = '';
      for await (const chunk of req) body += chunk;
      try { const event = normalizeCameraEvent(JSON.parse(body)); events = appendEvent(events, event); return json(res, 201, event); }
      catch (error) { return json(res, 400, { error: error instanceof Error ? error.message : 'Не удалось добавить событие' }); }
    }
    if (req.method === 'POST' && req.url === '/api/cameras') {
      let body = '';
      for await (const chunk of req) body += chunk;
      try {
        const camera = createCamera(JSON.parse(body));
        cameras.push(camera);
        return json(res, 201, camera);
      } catch (error) {
        return json(res, 400, { error: error instanceof Error ? error.message : 'Некорректные данные камеры' });
      }
    }
    return json(res, 404, { error: 'Маршрут не найден' });
  });
}

if (process.env.NODE_ENV !== 'test') {
  createServer().listen(process.env.PORT || 8787, () => console.log('Локальная панель камер запущена'));
}
