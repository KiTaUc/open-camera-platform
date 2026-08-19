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
