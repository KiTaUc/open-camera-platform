const privateHost = /^(localhost|127\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/;

function decode(value) { try { return decodeURIComponent(value); } catch { return value; } }

export function validateCameraInput(input) {
  if (!input?.name?.trim()) throw new Error('Укажите название камеры');
  if (!['onvif', 'rtsp'].includes(input.mode)) throw new Error('Выберите ONVIF или RTSP');
  const address = new URL(input.address);
  if (!['rtsp:', 'http:', 'https:'].includes(address.protocol)) throw new Error('Поддерживаются адреса RTSP, HTTP и HTTPS');
  if (!privateHost.test(address.hostname) && !input.allowRemoteAddress) throw new Error('Для защиты по умолчанию разрешены только адреса локальной сети');
  const credentials = address.username || address.password ? { username: decode(address.username), password: decode(address.password) } : null;
  address.username = ''; address.password = '';
  return { name: input.name.trim(), mode: input.mode, address: address.toString(), allowRemoteAddress: Boolean(input.allowRemoteAddress), credentials };
}

function makeProfile(input, profile, index) {
  if (!profile || typeof profile !== 'object') throw new Error('Профиль потока должен быть объектом');
  const id = typeof profile.id === 'string' && /^[a-z0-9_-]{1,32}$/i.test(profile.id) ? profile.id : index === 0 ? 'main' : `sub-${index}`;
  const label = typeof profile.label === 'string' && profile.label.trim() ? profile.label.trim().slice(0, 80) : index === 0 ? 'Основной' : 'Экономичный';
  const safe = validateCameraInput({ name: 'profile', mode: 'rtsp', address: profile.address, allowRemoteAddress: input.allowRemoteAddress });
  return { id, label, address: safe.address, credentials: safe.credentials };
}

function makeProfiles(input, safe) {
  if (input.profiles === undefined) return [{ id: 'main', label: 'Основной', address: safe.address, credentials: safe.credentials }];
  if (!Array.isArray(input.profiles) || input.profiles.length < 1 || input.profiles.length > 3) throw new Error('Укажите от одного до трёх профилей потока');
  const profiles = input.profiles.map((profile, index) => makeProfile(input, profile, index));
  if (new Set(profiles.map(profile => profile.id)).size !== profiles.length) throw new Error('Идентификаторы профилей должны быть уникальны');
  return profiles;
}

export function createCamera(input, now = new Date()) {
  const safe = validateCameraInput(input);
  return { id: crypto.randomUUID(), ...safe, profiles: makeProfiles(input, safe), status: 'new', createdAt: now.toISOString() };
}

export function publicCamera(camera) {
  const { credentials, profiles = [], ...result } = camera;
  return { ...result, profiles: profiles.map(({ credentials: _credentials, ...profile }) => profile) };
}

export function cameraConnectionUrl(camera, profileId = 'main') {
  const profile = camera.profiles?.find(candidate => candidate.id === profileId) ?? { address: camera.address, credentials: camera.credentials };
  const address = new URL(profile.address);
  if (profile.credentials?.username) address.username = profile.credentials.username;
  if (profile.credentials?.password) address.password = profile.credentials.password;
  return address.toString();
}

export function createArchiveSegment(cameraId, startedAt, endedAt, relativePath) {
  if (new Date(endedAt) <= new Date(startedAt)) throw new Error('Окончание сегмента должно быть позже начала');
  if (relativePath.startsWith('/') || relativePath.includes('..')) throw new Error('Путь архива должен быть относительным и безопасным');
  return { id: crypto.randomUUID(), cameraId, startedAt, endedAt, relativePath };
}
