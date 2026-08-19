export function appendAudit(index, { actorId, action, targetType, targetId, at = new Date().toISOString() }) {
  if (!actorId || !action || !targetType || !targetId) throw new Error('Для аудита требуются исполнитель, действие и объект');
  const timestamp = new Date(at);
  if (Number.isNaN(timestamp.valueOf())) throw new Error('Некорректное время аудита');
  const entry = { id: crypto.randomUUID(), actorId, action, targetType, targetId, at: timestamp.toISOString() };
  return [entry, ...index].sort((left, right) => right.at.localeCompare(left.at));
}
