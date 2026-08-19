export function validateRecordingPolicy(policy) {
  if (!['continuous', 'schedule', 'event'].includes(policy?.mode)) throw new Error('Выберите непрерывную, плановую или событийную запись');
  if (policy.mode === 'schedule') {
    if (!/^\d\d:\d\d$/.test(policy.start) || !/^\d\d:\d\d$/.test(policy.end)) throw new Error('Для расписания укажите время в формате ЧЧ:ММ');
  }
  if (policy.mode === 'event') {
    const seconds = Number(policy.postEventSeconds);
    if (!Number.isInteger(seconds) || seconds < 0 || seconds > 3600) throw new Error('Длительность записи после события должна быть от 0 до 3600 секунд');
  }
  return { mode: policy.mode, start: policy.start || null, end: policy.end || null, postEventSeconds: policy.mode === 'event' ? Number(policy.postEventSeconds) : null };
}

export function shouldRecord(policy, { now = new Date(), event = false } = {}) {
  if (policy.mode === 'continuous') return true;
  if (policy.mode === 'event') return event;
  const current = now.toISOString().slice(11, 16);
  return policy.start <= policy.end ? current >= policy.start && current < policy.end : current >= policy.start || current < policy.end;
}
