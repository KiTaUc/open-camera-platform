import assert from 'node:assert/strict';
import test from 'node:test';
import { validateRemoteAccess } from '../src/remote-access.mjs';

test('принимает HTTPS-шлюз и запрещает прямое раскрытие RTSP', () => {
  assert.equal(validateRemoteAccess({ mode: 'https-gateway', url: 'https://home.example.net' }).mode, 'https-gateway');
  assert.throws(() => validateRemoteAccess({ mode: 'vpn', exposeRtsp: true }));
});
