import assert from 'node:assert/strict';
import test from 'node:test';
import { can, requirePermission } from '../src/access-control.mjs';

test('разделяет права владельца и наблюдателя', () => {
  assert.equal(can('owner', 'camera:manage'), true);
  assert.equal(can('viewer', 'camera:manage'), false);
  assert.throws(() => requirePermission('viewer', 'recording:manage'));
});
