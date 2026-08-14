import { fromDateString } from '../database';
import { monthNames } from '../app/hooks/calendar_logic';

// Display form of a YYYY-MM-DD key, e.g. "August 12, 2026". Parsing goes through
// fromDateString rather than `new Date(key)`, which reads a bare date as UTC and
// can render the previous day in western timezones.
export function formatDateLong(key: string) {
  const date = fromDateString(key);
  return `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}
