const movements = new Set(['up', 'down', 'left', 'right', 'zoom-in', 'zoom-out', 'stop']);

export function createPtzCommand({ cameraId, movement, speed = 0.5 }) {
  if (!cameraId) throw new Error('Не указана камера для PTZ-команды');
  if (!movements.has(movement)) throw new Error('Недопустимая PTZ-команда');
  if (typeof speed !== 'number' || speed < 0 || speed > 1) throw new Error('Скорость PTZ должна быть от 0 до 1');
  return { id: crypto.randomUUID(), cameraId, movement, speed: movement === 'stop' ? 0 : speed, createdAt: new Date().toISOString() };
}
