// Whole seconds in, mm:ss out - 1965 reads as "32:45". Minutes deliberately
// aren't rolled into hours: a logged exercise reads better as "95:00" than as
// "1:35:00", which is easy to misread as 1 minute 35.
export function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
}
