import path from 'node:path';
import { spawn as systemSpawn } from 'node:child_process';
import { EventEmitter } from 'node:events';

export function createLiveStreamPlan({ cameraId, rtspUrl, streamDirectory }) {
  if (!/^[a-zA-Z0-9_-]+$/.test(cameraId)) throw new Error('Некорректный идентификатор камеры');
  if (new URL(rtspUrl).protocol !== 'rtsp:') throw new Error('Для живого просмотра нужен RTSP-поток');
  const playlist = path.join(streamDirectory, cameraId, 'index.m3u8');
  return { executable: 'ffmpeg', arguments: ['-rtsp_transport', 'tcp', '-i', rtspUrl, '-c:v', 'copy', '-an', '-f', 'hls', '-hls_time', '2', '-hls_list_size', '6', '-hls_flags', 'delete_segments', playlist], playlist };
}

export class LiveStreamer {
  #streams = new Map();
  #spawn;
  constructor({ spawn = process.env.NODE_ENV === 'test' ? createTestProcess : systemSpawn } = {}) { this.#spawn = spawn; }
  start(input) {
    if (this.#streams.has(input.cameraId)) throw new Error('Живой поток этой камеры уже запущен');
    const plan = createLiveStreamPlan(input);
    const child = this.#spawn(plan.executable, plan.arguments, { stdio: ['ignore', 'ignore', 'pipe'] });
    this.#streams.set(input.cameraId, { child, playlist: plan.playlist, startedAt: new Date().toISOString() });
    child.once('exit', () => this.#streams.delete(input.cameraId));
    child.once('error', () => this.#streams.delete(input.cameraId));
    return { cameraId: input.cameraId, state: 'running', playlist: plan.playlist };
  }
  stop(cameraId) { const stream = this.#streams.get(cameraId); if (!stream) throw new Error('Живой поток не найден'); stream.child.kill('SIGTERM'); this.#streams.delete(cameraId); return { cameraId, state: 'stopping' }; }
  list() { return [...this.#streams.entries()].map(([cameraId, value]) => ({ cameraId, state: 'running', playlist: value.playlist, startedAt: value.startedAt })); }
}

function createTestProcess() {
  const child = new EventEmitter();
  child.kill = () => {};
  return child;
}
