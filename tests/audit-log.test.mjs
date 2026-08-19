import assert from 'node:assert/strict';
import test from 'node:test';
import { appendAudit } from '../src/audit-log.mjs';

test('журнал аудита фиксирует исполнителя и сортирует новые действия первыми', () => {
  let index = appendAudit([], { actorId: 'owner', action: 'camera.create', targetType: 'camera', targetId: 'front', at: '2026-08-19T12:00:00Z' });
  index = appendAudit(index, { actorId: 'owner', action: 'archive.retention', targetType: 'archive', targetId: '1', at: '2026-08-19T12:01:00Z' });
  assert.equal(index.length, 2);
  assert.equal(index[0].action, 'archive.retention');
  assert.equal(index[0].actorId, 'owner');
});
