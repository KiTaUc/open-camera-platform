import assert from 'node:assert/strict';
import test from 'node:test';
import { addSegment, searchArchiveSegments, selectExpiredSegments, summarizeStorage } from '../src/archive-index.mjs';

test('индексирует безопасный сегмент локального архива', () => {
  const index = addSegment([], { cameraId: 'front', relativePath: 'front/2026-08-19/10-00.mp4', startedAt: '2026-08-19T10:00:00Z', endedAt: '2026-08-19T10:05:00Z', bytes: 20 });
  assert.equal(index.length, 1);
});

test('выбирает устаревшие сегменты для очистки', () => {
  const index = [{ cameraId: 'front', relativePath: 'front/old.mp4', startedAt: '2026-07-01T10:00:00Z', endedAt: '2026-07-01T10:05:00Z', bytes: 20 }];
  assert.equal(selectExpiredSegments(index, { before: '2026-08-01T00:00:00Z' }).length, 1);
});

test('считает объём и временные границы локального архива', () => {
  const index = [
    { cameraId: 'front', relativePath: 'front/old.mp4', startedAt: '2026-08-19T10:00:00Z', endedAt: '2026-08-19T10:05:00Z', bytes: 20 },
    { cameraId: 'front', relativePath: 'front/new.mp4', startedAt: '2026-08-19T10:05:00Z', endedAt: '2026-08-19T10:10:00Z', bytes: 30 },
  ];
  assert.deepEqual(summarizeStorage(index), { segments: 2, bytes: 50, oldestAt: '2026-08-19T10:00:00Z', newestAt: '2026-08-19T10:10:00Z' });
});

test('ищет пересекающиеся временной шкале сегменты одной камеры в обратном порядке', () => {
  const index = [
    { cameraId: 'front', relativePath: 'front/a.mp4', startedAt: '2026-08-19T10:00:00Z', endedAt: '2026-08-19T10:05:00Z', bytes: 20 },
    { cameraId: 'front', relativePath: 'front/b.mp4', startedAt: '2026-08-19T10:05:00Z', endedAt: '2026-08-19T10:10:00Z', bytes: 30 },
    { cameraId: 'hall', relativePath: 'hall/a.mp4', startedAt: '2026-08-19T10:04:00Z', endedAt: '2026-08-19T10:09:00Z', bytes: 40 },
  ];
  const result = searchArchiveSegments(index, { cameraId: 'front', from: '2026-08-19T10:04:00Z', to: '2026-08-19T10:06:00Z' });
  assert.deepEqual(result.segments.map(segment => segment.relativePath), ['front/b.mp4', 'front/a.mp4']);
  assert.equal(result.bytes, 50);
});

test('отклоняет инвертированный временной диапазон поиска', () => {
  assert.throws(() => searchArchiveSegments([], { from: '2026-08-20T10:00:00Z', to: '2026-08-20T09:00:00Z' }), /Окончание поиска/);
});
