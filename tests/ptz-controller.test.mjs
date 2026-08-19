import assert from 'node:assert/strict';
import test from 'node:test';
import { createPtzCommand } from '../src/ptz-controller.mjs';

test('создаёт ограниченную PTZ-команду и не допускает неверную скорость', () => {
  assert.equal(createPtzCommand({ cameraId: 'yard', movement: 'left', speed: 0.4 }).movement, 'left');
  assert.throws(() => createPtzCommand({ cameraId: 'yard', movement: 'left', speed: 2 }));
});
