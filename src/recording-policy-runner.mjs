import { validateRecordingPolicy, shouldRecord } from './recording-policy.mjs';

export class RecordingPolicyRunner {
  #policies = new Map();
  #managed = new Set();
  #eventUntil = new Map();
  #recorder;
  #getCamera;
  #archiveDirectory;
  #now;

  constructor({ recorder, getCamera, archiveDirectory, initialPolicies = [], now = () => new Date() }) {
    this.#recorder = recorder;
    this.#getCamera = getCamera;
    this.#archiveDirectory = archiveDirectory;
    this.#now = now;
    for (const policy of initialPolicies) if (policy?.cameraId && policy?.mode) this.#policies.set(policy.cameraId, { ...policy });
  }

  configure({ cameraId, ...input }) {
    if (!cameraId || !this.#getCamera(cameraId)) throw new Error('Камера для политики записи не найдена');
    const policy = { cameraId, ...validateRecordingPolicy(input), updatedAt: this.#now().toISOString() };
    const previous = this.#policies.get(cameraId);
    if (previous && previous.mode !== policy.mode) this.#stopManaged(cameraId, 'policy-changed');
    this.#policies.set(cameraId, policy);
    if (policy.mode !== 'event') this.#eventUntil.delete(cameraId);
    return { ...policy };
  }

  list() { return [...this.#policies.values()].map(policy => ({ ...policy, eventUntil: this.#eventUntil.get(policy.cameraId)?.toISOString() ?? null })); }

  persistable() { return [...this.#policies.values()].map(policy => ({ ...policy })); }

  evaluate({ now = this.#now() } = {}) {
    const results = [];
    for (const policy of this.#policies.values()) {
      if (policy.mode === 'event') {
        const eventUntil = this.#eventUntil.get(policy.cameraId);
        if (eventUntil && now >= eventUntil) {
          results.push(this.#stopManaged(policy.cameraId, 'event-finished'));
          this.#eventUntil.delete(policy.cameraId);
        }
        continue;
      }
      if (shouldRecord(policy, { now })) results.push(this.#ensureStarted(policy.cameraId, policy.mode));
      else results.push(this.#stopManaged(policy.cameraId, 'schedule-finished'));
    }
    return results.filter(result => result.action !== 'unchanged');
  }

  onEvent(event, { now = this.#now() } = {}) {
    const policy = this.#policies.get(event.cameraId);
    if (!policy || policy.mode !== 'event') return { cameraId: event.cameraId, action: 'ignored' };
    const until = new Date(now.valueOf() + policy.postEventSeconds * 1000);
    this.#eventUntil.set(event.cameraId, until);
    const result = this.#ensureStarted(event.cameraId, 'event');
    return { ...result, eventUntil: until.toISOString() };
  }

  #isRunning(cameraId) { return this.#recorder.list().some(job => job.cameraId === cameraId); }

  #ensureStarted(cameraId, trigger) {
    if (this.#isRunning(cameraId)) return { cameraId, action: 'unchanged', trigger };
    const camera = this.#getCamera(cameraId);
    if (!camera?.address?.startsWith('rtsp:')) return { cameraId, action: 'skipped', trigger, reason: 'rtsp-required' };
    this.#recorder.start({ cameraId, rtspUrl: camera.address, archiveDirectory: this.#archiveDirectory });
    this.#managed.add(cameraId);
    return { cameraId, action: 'started', trigger };
  }

  #stopManaged(cameraId, reason) {
    if (!this.#managed.has(cameraId) || !this.#isRunning(cameraId)) return { cameraId, action: 'unchanged', reason };
    this.#recorder.stop(cameraId);
    this.#managed.delete(cameraId);
    return { cameraId, action: 'stopped', reason };
  }
}
