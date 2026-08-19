import { createRecordingPlan } from './recording-plan.mjs';

export class RecorderManager {
  #jobs = new Map();

  start(input) {
    if (this.#jobs.has(input.cameraId)) throw new Error('Запись этой камеры уже запущена');
    const plan = createRecordingPlan(input);
    const job = { cameraId: input.cameraId, state: 'starting', startedAt: new Date().toISOString(), plan };
    this.#jobs.set(input.cameraId, job);
    return { ...job, plan: { executable: plan.executable, output: plan.output } };
  }

  markRunning(cameraId) {
    const job = this.#jobs.get(cameraId);
    if (!job) throw new Error('Задание записи не найдено');
    job.state = 'running';
    return { cameraId, state: job.state };
  }

  stop(cameraId) {
    const job = this.#jobs.get(cameraId);
    if (!job) throw new Error('Задание записи не найдено');
    this.#jobs.delete(cameraId);
    return { cameraId, state: 'stopped' };
  }

  list() {
    return [...this.#jobs.values()].map(job => ({ cameraId: job.cameraId, state: job.state, startedAt: job.startedAt, output: job.plan.output }));
  }
}
