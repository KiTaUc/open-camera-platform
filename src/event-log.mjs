export function normalizeCameraEvent({ cameraId, topic, occurredAt = new Date().toISOString(), payload = {} }) {
  if (!cameraId) throw new Error('Не указан идентификатор камеры');
  const type = /motion/i.test(topic) ? 'motion' : /tamper/i.test(topic) ? 'tamper' : 'camera';
  return { id: crypto.randomUUID(), cameraId, type, topic, occurredAt: new Date(occurredAt).toISOString(), payload };
}

export function appendEvent(events, event) {
  return [...events, event].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}
