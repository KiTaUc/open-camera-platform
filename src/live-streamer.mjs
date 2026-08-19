import path from 'node:path';
import { spawn as systemSpawn } from 'node:child_process';
import { EventEmitter } from 'node:events';

export function createLiveStreamPlan({ cameraId, rtspUrl, streamDirectory }) {
  if (!/^[a-zA-Z0-9_-]+$/.test(cameraId)) throw new Error('Некорректный идентификатор камеры');
  if (new URL(rtspUrl).protocol !== 'rtsp:') throw new Error('Для живого просмотра нужен RTSP-поток');
  const streamId = arguments[0].streamId ?? cameraId;
  if (!/^[a-zA-Z0-9_-]+$/.test(streamId)) throw new Error('Некорректный идентификатор потока');
  const playlist = path.join(streamDirectory, streamId, 'index.m3u8');
  return { executable: 'ffmpeg', arguments: ['-rtsp_transport', 'tcp', '-i', rtspUrl, '-c:v', 'copy', '-an', '-f', 'hls', '-hls_time', '2', '-hls_list_size', '6', '-hls_flags', 'delete_segments', playlist], playlist };
}

export class LiveStreamer {
  #streams = new Map();
  #spawn;
  constructor({ spawn = process.env.NODE_ENV === 'test' ? createTestProcess : systemSpawn } = {}) { this.#spawn = spawn; }
  start(input) {
    const streamId = input.streamId ?? input.cameraId;
    if (this.#streams.has(streamId)) throw new Error('Выбранный живой поток уже запущен');
    const plan = createLiveStreamPlan(input);
    const child = this.#spawn(plan.executable, plan.arguments, { stdio: ['ignore', 'ignore', 'pipe'] });
    this.#streams.set(streamId, { child, cameraId: input.cameraId, profileId: input.profileId ?? 'main', playlist: plan.playlist, startedAt: new Date().toISOString() });
    child.once('exit', () => this.#streams.delete(streamId));
    child.once('error', () => this.#streams.delete(streamId));
    return { streamId, cameraId: input.cameraId, profileId: input.profileId ?? 'main', state: 'running', playlist: plan.playlist };
  }
  stop(streamId) { const stream = this.#streams.get(streamId); if (!stream) throw new Error('Живой поток не найден'); stream.child.kill('SIGTERM'); this.#streams.delete(streamId); return { streamId, cameraId: stream.cameraId, state: 'stopping' }; }
  list() { return [...this.#streams.entries()].map(([streamId, value]) => ({ streamId, cameraId: value.cameraId, profileId: value.profileId, state: 'running', playlist: value.playlist, startedAt: value.startedAt })); }
}

function createTestProcess() {
  const child = new EventEmitter();
  child.kill = () => {};
  return child;
}
