import { spawn as systemSpawn } from 'node:child_process';
import { createRecordingPlan } from './recording-plan.mjs';

export class FfmpegRecorder {
  #processes = new Map();
  #spawn;

  constructor({ spawn = systemSpawn } = {}) { this.#spawn = spawn; }

  start(input) {
    if (this.#processes.has(input.cameraId)) throw new Error('Запись этой камеры уже выполняется');
    const plan = createRecordingPlan(input);
    const child = this.#spawn(plan.executable, plan.arguments, { stdio: ['ignore', 'ignore', 'pipe'] });
    const job = { child, state: 'running', startedAt: new Date().toISOString(), output: plan.output };
    this.#processes.set(input.cameraId, job);
    child.once('exit', () => this.#processes.delete(input.cameraId));
    child.once('error', () => this.#processes.delete(input.cameraId));
    return { cameraId: input.cameraId, state: job.state, startedAt: job.startedAt, output: job.output };
  }

  stop(cameraId) {
    const job = this.#processes.get(cameraId);
    if (!job) throw new Error('Активная запись не найдена');
    job.child.kill('SIGTERM');
    this.#processes.delete(cameraId);
    return { cameraId, state: 'stopping' };
  }

  list() {
    return [...this.#processes.entries()].map(([cameraId, job]) => ({ cameraId, state: job.state, startedAt: job.startedAt, output: job.output }));
  }
}
