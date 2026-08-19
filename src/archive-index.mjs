export function addSegment(index, segment) {
  if (!segment?.cameraId || !segment?.relativePath) throw new Error('Для сегмента требуются камера и относительный путь');
  if (segment.relativePath.startsWith('/') || segment.relativePath.includes('..')) throw new Error('Путь сегмента небезопасен');
  const started = new Date(segment.startedAt);
  const ended = new Date(segment.endedAt);
  if (Number.isNaN(started.valueOf()) || Number.isNaN(ended.valueOf()) || ended <= started) throw new Error('Некорректный временной интервал сегмента');
  return [...index, { ...segment, startedAt: started.toISOString(), endedAt: ended.toISOString() }].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}

export function selectExpiredSegments(index, { before, maxBytes = Infinity }) {
  const cutoff = new Date(before);
  if (Number.isNaN(cutoff.valueOf())) throw new Error('Некорректная дата политики хранения');
  if (maxBytes !== Infinity && (!Number.isFinite(maxBytes) || maxBytes < 0)) throw new Error('Лимит хранилища должен быть неотрицательным числом');
  const ordered = [...index].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  let total = ordered.reduce((sum, segment) => sum + (segment.bytes || 0), 0);
  const expired = [];
  for (const segment of ordered) {
    if (new Date(segment.endedAt) < cutoff || total > maxBytes) {
      expired.push(segment);
      total -= segment.bytes || 0;
    }
  }
  return expired;
}

export function summarizeStorage(index) {
  const ordered = [...index].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  return {
    segments: ordered.length,
    bytes: ordered.reduce((sum, segment) => sum + (Number.isFinite(segment.bytes) && segment.bytes > 0 ? segment.bytes : 0), 0),
    oldestAt: ordered.at(0)?.startedAt ?? null,
    newestAt: ordered.at(-1)?.endedAt ?? null,
  };
}

function timeBound(value, field) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) throw new Error(`Некорректная дата ${field}`);
  return parsed;
}

export function searchArchiveSegments(index, { cameraId, from, to, limit = 50 } = {}) {
  if (cameraId !== undefined && (typeof cameraId !== 'string' || !cameraId.trim())) throw new Error('Идентификатор камеры для поиска некорректен');
  const start = timeBound(from, 'начала поиска');
  const end = timeBound(to, 'окончания поиска');
  if (start && end && end <= start) throw new Error('Окончание поиска должно быть позже начала');
  const numericLimit = Number(limit);
  if (!Number.isInteger(numericLimit) || numericLimit < 1 || numericLimit > 200) throw new Error('Лимит выдачи должен быть целым числом от 1 до 200');
  const matching = index.filter(segment => {
    if (cameraId && segment.cameraId !== cameraId) return false;
    if (start && new Date(segment.endedAt) <= start) return false;
    if (end && new Date(segment.startedAt) >= end) return false;
    return true;
  }).sort((left, right) => right.startedAt.localeCompare(left.startedAt));
  const segments = matching.slice(0, numericLimit);
  return {
    query: { cameraId: cameraId ?? null, from: start?.toISOString() ?? null, to: end?.toISOString() ?? null, limit: numericLimit },
    total: matching.length,
    bytes: segments.reduce((sum, segment) => sum + (Number.isFinite(segment.bytes) && segment.bytes > 0 ? segment.bytes : 0), 0),
    segments,
  };
}
