const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;

export const formatOffset = (ms: number): string => {
  const totalSeconds = Math.floor(Math.max(ms, 0) / MS_PER_SECOND);
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};
