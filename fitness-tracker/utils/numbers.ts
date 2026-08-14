// Text inputs hand back strings; empty or garbage input should store 0 rather
// than the NaN that parseFloat returns, which SQLite would take as NULL.
export function toNumber(value: string) {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

// For the INTEGER columns - sets, reps and calories. Without the rounding a
// typed "2.5" reaches SQLite as a real and is stored as one.
export function toInt(value: string) {
  return Math.round(toNumber(value));
}
