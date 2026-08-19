const privateHost = /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/;

export function validateCameraInput(input) {
  if (!input?.name?.trim()) throw new Error('Укажите название камеры');
  if (!['onvif', 'rtsp'].includes(input.mode)) throw new Error('Выберите ONVIF или RTSP');
  const address = new URL(input.address);
  if (address.protocol !== 'rtsp:' && address.protocol !== 'http:' && address.protocol !== 'https:') {
    throw new Error('Поддерживаются адреса RTSP, HTTP и HTTPS');
  }
  if (!privateHost.test(address.hostname) && !input.allowRemoteAddress) {
    throw new Error('Для защиты по умолчанию разрешены только адреса локальной сети');
  }
  return { name: input.name.trim(), mode: input.mode, address: address.toString(), allowRemoteAddress: Boolean(input.allowRemoteAddress) };
}

export function createCamera(input, now = new Date()) {
  const safe = validateCameraInput(input);
  return { id: crypto.randomUUID(), ...safe, status: 'new', createdAt: now.toISOString() };
}

export function createArchiveSegment(cameraId, startedAt, endedAt, relativePath) {
  if (new Date(endedAt) <= new Date(startedAt)) throw new Error('Окончание сегмента должно быть позже начала');
  if (relativePath.startsWith('/') || relativePath.includes('..')) throw new Error('Путь архива должен быть относительным и безопасным');
  return { id: crypto.randomUUID(), cameraId, startedAt, endedAt, relativePath };
}
