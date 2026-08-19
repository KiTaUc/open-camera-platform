import assert from 'node:assert/strict';
import test from 'node:test';
import { appendEvent, normalizeCameraEvent } from '../src/event-log.mjs';

test('преобразует событие ONVIF движения в локальный журнал', () => {
  const event = normalizeCameraEvent({ cameraId: 'yard', topic: 'tns1:RuleEngine/CellMotionDetector/Motion' });
  assert.equal(event.type, 'motion');
  assert.equal(appendEvent([], event)[0].cameraId, 'yard');
});
