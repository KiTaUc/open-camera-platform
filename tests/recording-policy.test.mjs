import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldRecord, validateRecordingPolicy } from '../src/recording-policy.mjs';

test('применяет режимы непрерывной, плановой и событийной записи', () => {
  assert.equal(shouldRecord(validateRecordingPolicy({ mode: 'continuous' })), true);
  assert.equal(shouldRecord(validateRecordingPolicy({ mode: 'event', postEventSeconds: 30 }), { event: false }), false);
  assert.equal(shouldRecord(validateRecordingPolicy({ mode: 'schedule', start: '22:00', end: '06:00' }), { now: new Date('2026-08-19T23:00:00Z') }), true);
});
