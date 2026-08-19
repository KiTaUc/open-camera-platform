import http from 'node:http';
import { createCamera } from './camera-registry.mjs';
import { dashboardHtml } from './dashboard.mjs';

const cameras = [];

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
    if (req.method === 'GET' && req.url === '/api/cameras') return json(res, 200, cameras);
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
