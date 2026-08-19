import assert from 'node:assert/strict';
import test from 'node:test';
import { createOnvifProbe, parseProbeMatch } from '../src/onvif-discovery.mjs';

test('формирует Probe для сетевых видеопередатчиков ONVIF', () => {
  assert.match(createOnvifProbe('11111111-1111-1111-1111-111111111111'), /NetworkVideoTransmitter/);
});

test('извлекает только HTTP адреса служб из ответа', () => {
  assert.deepEqual(parseProbeMatch('<d:XAddrs>http://192.168.1.20/onvif/device_service ftp://bad</d:XAddrs>'), ['http://192.168.1.20/onvif/device_service']);
});
