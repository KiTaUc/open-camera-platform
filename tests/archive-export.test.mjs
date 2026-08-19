import assert from 'node:assert/strict';
import test from 'node:test';
import { createArchiveExport } from '../src/archive-export.mjs';

const archive = [
  { id: 'a', cameraId: 'cam-1', relativePath: 'cam-1/a.mp4', startedAt: '2026-08-20T10:00:00Z', endedAt: '2026-08-20T10:05:00Z', bytes: 100 },
  { id: 'b', cameraId: 'cam-1', relativePath: 'cam-1/b.mp4', startedAt: '2026-08-20T10:05:00Z', endedAt: '2026-08-20T10:10:00Z', bytes: 120 },
  { id: 'c', cameraId: 'cam-2', relativePath: 'cam-2/a.mp4', startedAt: '2026-08-20T10:00:00Z', endedAt: '2026-08-20T10:05:00Z', bytes: 90 },
];
test('готовит локальный экспорт всех пересекающихся сегментов одной камеры', () => {
  const result = createArchiveExport(archive, { cameraId: 'cam-1', from: '2026-08-20T10:04:00Z', to: '2026-08-20T10:06:00Z' }, new Date('2026-08-20T12:00:00Z'));
  assert.equal(result.segments.length, 2);
  assert.equal(result.bytes, 220);
  assert.equal(result.state, 'prepared');
});
test('отклоняет пустой диапазон и слишком большой локальный экспорт', () => {
  assert.throws(() => createArchiveExport(archive, { cameraId: 'cam-1', from: '2026-08-20T10:00:00Z', to: '2026-08-20T10:00:00Z' }), /позже/);
  assert.throws(() => createArchiveExport(archive, { cameraId: 'cam-1', from: '2026-08-20T00:00:00Z', to: '2026-08-22T00:00:00Z' }), /24 часа/);
});
