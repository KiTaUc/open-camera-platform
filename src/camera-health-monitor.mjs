const states = new Set(['online', 'degraded', 'offline', 'unknown']);

function normalize(result) {
  if (!states.has(result?.state)) return { state: 'unknown', detail: 'Проверка не вернула допустимый статус' };
  return { state: result.state, detail: typeof result.detail === 'string' ? result.detail.slice(0, 240) : '' };
}

export class CameraHealthMonitor {
  constructor({ probe = async () => ({ state: 'unknown', detail: 'Для этой камеры не настроен безопасный сетевой опрос' }), now = () => new Date() } = {}) {
    this.probe = probe;
    this.now = now;
  }

  async evaluate(cameras, liveStreams = []) {
    const liveCameraIds = new Set(liveStreams.filter(stream => stream.state === 'started').map(stream => stream.cameraId));
    return Promise.all(cameras.map(async camera => {
      if (liveCameraIds.has(camera.id)) return { cameraId: camera.id, state: 'online', detail: 'Локальный HLS-поток запущен', checkedAt: this.now().toISOString(), source: 'hls' };
      try {
        const result = normalize(await this.probe(camera));
        return { cameraId: camera.id, ...result, checkedAt: this.now().toISOString(), source: 'probe' };
      } catch {
        return { cameraId: camera.id, state: 'offline', detail: 'Безопасная проверка доступности завершилась ошибкой', checkedAt: this.now().toISOString(), source: 'probe' };
      }
    }));
  }
}
