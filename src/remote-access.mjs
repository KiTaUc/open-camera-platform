export function validateRemoteAccess(config) {
  if (!['vpn', 'https-gateway'].includes(config?.mode)) throw new Error('Для удалённого доступа выберите VPN или HTTPS-шлюз');
  if (config.mode === 'https-gateway') {
    const url = new URL(config.url);
    if (url.protocol !== 'https:') throw new Error('HTTPS-шлюз должен использовать HTTPS');
  }
  if (config?.exposeRtsp) throw new Error('Прямой доступ к RTSP камеры из интернета запрещён');
  return { mode: config.mode, url: config.url || null, exposeRtsp: false };
}
