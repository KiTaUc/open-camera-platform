import path from 'node:path';

export function createRecordingPlan({ cameraId, rtspUrl, archiveDirectory, segmentSeconds = 300 }) {
  if (!/^[a-zA-Z0-9_-]+$/.test(cameraId)) throw new Error('Некорректный идентификатор камеры');
  if (new URL(rtspUrl).protocol !== 'rtsp:') throw new Error('Для записи нужен RTSP-поток');
  if (!Number.isInteger(segmentSeconds) || segmentSeconds < 30 || segmentSeconds > 3600) throw new Error('Сегмент записи должен длиться от 30 до 3600 секунд');
  const output = path.join(archiveDirectory, cameraId, '%Y-%m-%d', '%H-%M-%S.mp4');
  return {
    executable: 'ffmpeg',
    arguments: ['-rtsp_transport', 'tcp', '-i', rtspUrl, '-c', 'copy', '-f', 'segment', '-segment_time', String(segmentSeconds), '-strftime', '1', output],
    output,
  };
}
