import { spawn as systemSpawn } from 'node:child_process';
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export function createSnapshotPlan({ cameraId, rtspUrl, snapshotDirectory, capturedAt = new Date() }) {
  if (!/^[a-zA-Z0-9_-]+$/.test(cameraId || '')) throw new Error('Некорректный идентификатор камеры');
  if (new URL(rtspUrl).protocol !== 'rtsp:') throw new Error('Для снимка нужен RTSP-поток');
  if (!snapshotDirectory) throw new Error('Не задан каталог снимков');
  const timestamp = new Date(capturedAt);
  if (Number.isNaN(timestamp.valueOf())) throw new Error('Некорректное время снимка');
  const relativePath = `${cameraId}/${randomUUID()}.jpg`;
  const outputPath = path.join(snapshotDirectory, relativePath);
  return {
    executable: 'ffmpeg',
    arguments: ['-y', '-rtsp_transport', 'tcp', '-i', rtspUrl, '-frames:v', '1', '-q:v', '2', outputPath],
    cameraId,
    relativePath,
    outputPath,
    capturedAt: timestamp.toISOString(),
  };
}

export class SnapshotCapturer {
  #spawn;
  #now;

  constructor({ spawn = process.env.NODE_ENV === 'test' ? null : systemSpawn, now = () => new Date() } = {}) {
    this.#spawn = spawn;
    this.#now = now;
  }

  async capture(input) {
    const plan = createSnapshotPlan({ ...input, capturedAt: this.#now() });
    if (!this.#spawn) return { cameraId: plan.cameraId, relativePath: plan.relativePath, capturedAt: plan.capturedAt, bytes: 0, state: 'captured' };
    await mkdir(path.dirname(plan.outputPath), { recursive: true });
    return new Promise((resolve, reject) => {
      const child = this.#spawn(plan.executable, plan.arguments, { stdio: ['ignore', 'ignore', 'pipe'] });
      child.once('error', error => reject(new Error(`Не удалось запустить ffmpeg для снимка: ${error.message}`)));
      child.once('exit', async code => {
        if (code !== 0) return reject(new Error('ffmpeg не смог получить снимок камеры'));
        try {
          const info = await stat(plan.outputPath);
          resolve({ cameraId: plan.cameraId, relativePath: plan.relativePath, capturedAt: plan.capturedAt, bytes: info.size, state: 'captured' });
        } catch { reject(new Error('Файл снимка не был создан')); }
      });
    });
  }
}
