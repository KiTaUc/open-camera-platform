function requireText(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Не указано поле «${field}»`);
  return value.trim();
}

function parseDate(value, field) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) throw new Error(`Некорректная дата ${field}`);
  return date.toISOString();
}

function unitNumber(value, field) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) throw new Error(`Поле «${field}» должно быть числом от 0 до 1`);
  return value;
}

function normalizeBox(value) {
  if (value === undefined) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Рамка объекта должна быть объектом');
  const box = { x: unitNumber(value.x, 'box.x'), y: unitNumber(value.y, 'box.y'), width: unitNumber(value.width, 'box.width'), height: unitNumber(value.height, 'box.height') };
  if (box.x + box.width > 1 || box.y + box.height > 1) throw new Error('Рамка объекта выходит за границы кадра');
  return box;
}

function normalizeObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Аналитический объект должен быть объектом');
  const classification = requireText(value.classification, 'classification').toLowerCase();
  if (!/^[a-z][a-z0-9_-]{0,31}$/.test(classification)) throw new Error('Класс объекта должен содержать латинские буквы, цифры, дефис или подчёркивание');
  const confidence = value.confidence === undefined ? null : unitNumber(value.confidence, 'confidence');
  return { classification, confidence, box: normalizeBox(value.box) };
}

export function normalizeAnalyticsEvent({ cameraId, occurredAt = new Date().toISOString(), objects }) {
  const normalizedCameraId = requireText(cameraId, 'cameraId');
  if (!Array.isArray(objects) || !objects.length || objects.length > 50) throw new Error('Укажите от одного до 50 аналитических объектов');
  return {
    id: crypto.randomUUID(),
    cameraId: normalizedCameraId,
    type: 'analytics',
    topic: 'analytics.object',
    occurredAt: parseDate(occurredAt, 'occurredAt'),
    payload: { objects: objects.map(normalizeObject) },
  };
}

export function searchAnalyticsEvents(events, { cameraId, classification, from, to, limit = 50 } = {}) {
  if (cameraId !== undefined) requireText(cameraId, 'cameraId');
  const normalizedClassification = classification === undefined ? null : requireText(classification, 'classification').toLowerCase();
  const start = from === undefined ? null : parseDate(from, 'начала поиска');
  const end = to === undefined ? null : parseDate(to, 'окончания поиска');
  if (start && end && end <= start) throw new Error('Окончание поиска должно быть позже начала');
  const numericLimit = Number(limit);
  if (!Number.isInteger(numericLimit) || numericLimit < 1 || numericLimit > 200) throw new Error('Лимит выдачи должен быть целым числом от 1 до 200');
  const matches = events.filter(event => {
    if (event.type !== 'analytics' || !Array.isArray(event.payload?.objects)) return false;
    if (cameraId && event.cameraId !== cameraId) return false;
    if (start && event.occurredAt < start) return false;
    if (end && event.occurredAt >= end) return false;
    return !normalizedClassification || event.payload.objects.some(object => object.classification === normalizedClassification);
  });
  return { query: { cameraId: cameraId ?? null, classification: normalizedClassification, from: start, to: end, limit: numericLimit }, total: matches.length, events: matches.slice(0, numericLimit) };
}
