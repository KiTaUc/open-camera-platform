export function createNotification(event, { recipientId, title } = {}) {
  if (!recipientId) throw new Error('Не указан получатель уведомления');
  const label = event.type === 'motion' ? 'Обнаружено движение' : event.type === 'tamper' ? 'Возможное вмешательство в камеру' : 'Событие камеры';
  return { id: crypto.randomUUID(), recipientId, eventId: event.id, cameraId: event.cameraId, title: title || label, createdAt: new Date().toISOString(), readAt: null };
}

export function markRead(notifications, notificationId, now = new Date()) {
  return notifications.map(notification => notification.id === notificationId ? { ...notification, readAt: now.toISOString() } : notification);
}
