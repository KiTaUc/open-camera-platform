import assert from 'node:assert/strict';
import test from 'node:test';
import { createNotification, markRead } from '../src/notification-center.mjs';

test('создаёт локальное уведомление о движении и отмечает его прочитанным', () => {
  const notification = createNotification({ id: 'event-1', cameraId: 'gate', type: 'motion' }, { recipientId: 'owner' });
  assert.equal(notification.title, 'Обнаружено движение');
  assert.ok(markRead([notification], notification.id)[0].readAt);
});
