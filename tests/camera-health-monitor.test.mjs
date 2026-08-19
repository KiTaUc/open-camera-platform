import assert from 'node:assert/strict';
import test from 'node:test';
import { CameraHealthMonitor } from '../src/camera-health-monitor.mjs';

const cameras = [{ id: 'cam-a', name: 'Двор' }, { id: 'cam-b', name: 'Гараж' }];
test('отмечает камеру с запущенным HLS как доступную без сетевого опроса', async () => {
  const monitor = new CameraHealthMonitor({ probe: async () => { throw new Error('не должен вызываться'); }, now: () => new Date('2026-08-20T10:00:00Z') });
  const result = await monitor.evaluate(cameras, [{ cameraId: 'cam-a', state: 'started' }]);
  assert.deepEqual(result[0], { cameraId: 'cam-a', state: 'online', detail: 'Локальный HLS-поток запущен', checkedAt: '2026-08-20T10:00:00.000Z', source: 'hls' });
});
test('сохраняет ответ безопасного опроса и изолирует ошибку одной камеры', async () => {
  const monitor = new CameraHealthMonitor({ probe: async camera => camera.id === 'cam-a' ? { state: 'degraded', detail: 'Высокая задержка' } : Promise.reject(new Error('timeout')), now: () => new Date('2026-08-20T10:00:00Z') });
  const result = await monitor.evaluate(cameras);
  assert.equal(result[0].state, 'degraded');
  assert.equal(result[1].state, 'offline');
});
