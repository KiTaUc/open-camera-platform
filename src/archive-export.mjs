import crypto from 'node:crypto';

function validDate(value, label) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) throw new Error(`Некорректная дата ${label}`);
  return date;
}

export function createArchiveExport(index, { cameraId, from, to }, now = new Date()) {
  if (typeof cameraId !== 'string' || !cameraId) throw new Error('Укажите камеру для экспорта');
  const start = validDate(from, 'начала'); const end = validDate(to, 'окончания');
  if (end <= start) throw new Error('Окончание экспорта должно быть позже начала');
  if (end.valueOf() - start.valueOf() > 86_400_000) throw new Error('Локальный экспорт ограничен диапазоном в 24 часа');
  const segments = index.filter(segment => segment.cameraId === cameraId && new Date(segment.startedAt) < end && new Date(segment.endedAt) > start).map(segment => ({ id: segment.id, relativePath: segment.relativePath, startedAt: segment.startedAt, endedAt: segment.endedAt, bytes: segment.bytes || 0 }));
  if (!segments.length) throw new Error('В выбранном диапазоне нет архивных сегментов');
  return { id: crypto.randomUUID(), cameraId, from: start.toISOString(), to: end.toISOString(), createdAt: now.toISOString(), state: 'prepared', segments, bytes: segments.reduce((sum, segment) => sum + segment.bytes, 0) };
}
