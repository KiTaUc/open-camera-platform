import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeAnalyticsEvent, searchAnalyticsEvents } from '../src/analytics-events.mjs';

test('нормализует локальное аналитическое событие без идентифицирующих данных', () => {
  const event = normalizeAnalyticsEvent({ cameraId: 'hall', occurredAt: '2026-08-20T10:00:00Z', objects: [{ classification: 'person', confidence: 0.92, box: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 } }] });
  assert.equal(event.type, 'analytics');
  assert.deepEqual(event.payload.objects[0], { classification: 'person', confidence: 0.92, box: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 } });
});

test('не допускает рамку за пределами кадра', () => {
  assert.throws(() => normalizeAnalyticsEvent({ cameraId: 'hall', objects: [{ classification: 'vehicle', box: { x: 0.8, y: 0, width: 0.3, height: 0.1 } }] }), /выходит за границы/);
});

test('не допускает некорректный класс объекта и избыточный пакет', () => {
  assert.throws(() => normalizeAnalyticsEvent({ cameraId: 'hall', objects: [{ classification: 'человек' }] }), /Класс объекта/);
  assert.throws(() => normalizeAnalyticsEvent({ cameraId: 'hall', objects: Array.from({ length: 51 }, () => ({ classification: 'person' })) }), /от одного до 50/);
});

test('ищет локальные аналитические события по камере, классу и времени', () => {
  const events = [
    normalizeAnalyticsEvent({ cameraId: 'hall', occurredAt: '2026-08-20T10:00:00Z', objects: [{ classification: 'person' }] }),
    normalizeAnalyticsEvent({ cameraId: 'yard', occurredAt: '2026-08-20T10:01:00Z', objects: [{ classification: 'vehicle' }] }),
  ];
  const result = searchAnalyticsEvents(events, { cameraId: 'hall', classification: 'person', from: '2026-08-20T09:59:00Z', to: '2026-08-20T10:01:00Z' });
  assert.equal(result.total, 1);
  assert.equal(result.events[0].cameraId, 'hall');
});
