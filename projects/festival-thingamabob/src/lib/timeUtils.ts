/**
 * Format a Date to a readable time string like "7:00 PM" or "1:47 AM"
 */
export function formatTime(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();

  let displayHour = hours % 12;
  if (displayHour === 0) displayHour = 12;

  const ampm = hours < 12 ? 'AM' : 'PM';
  const minStr = minutes.toString().padStart(2, '0');

  return `${displayHour}:${minStr} ${ampm}`;
}

/**
 * Format duration in minutes to a human-readable string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/**
 * Get duration between two dates in minutes
 */
export function getDurationMinutes(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

/**
 * Check if two time ranges overlap
 */
export function overlaps(
  aStart: Date, aEnd: Date,
  bStart: Date, bEnd: Date
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Add minutes to a Date, returning a new Date
 */
export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}

/**
 * Format a time range like "7:00 PM – 8:00 PM"
 */
export function formatTimeRange(start: Date, end: Date): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

/**
 * Format time for timeline grouping (hour label)
 */
export function formatHourLabel(date: Date): string {
  const hours = date.getHours();
  const ampm = hours < 12 ? 'AM' : 'PM';
  let displayHour = hours % 12;
  if (displayHour === 0) displayHour = 12;
  return `${displayHour} ${ampm}`;
}

/**
 * Returns true if the date is considered "after midnight" (0:00 - 5:59)
 */
export function isPostMidnight(date: Date): boolean {
  return date.getHours() < 6;
}

const FESTIVAL_BASE_DATES: Record<string, string> = {
  'Friday': '2026-05-15',
  'Saturday': '2026-05-16',
  'Sunday': '2026-05-17',
};

/**
 * Convert a "HH:MM" 24h start time to an absolute Date for the given festival day.
 * HH >= 17 → evening of the festival date; HH < 17 → post-midnight (next calendar day).
 */
export function parseDayStartTime(day: string, timeHHMM: string): Date {
  const [hh, mm] = timeHHMM.split(':').map(Number);
  const baseStr = FESTIVAL_BASE_DATES[day] ?? FESTIVAL_BASE_DATES['Friday'];
  const date = new Date(`${baseStr}T00:00:00`);
  if (hh >= 17) {
    date.setHours(hh, mm, 0, 0);
  } else {
    date.setDate(date.getDate() + 1);
    date.setHours(hh, mm, 0, 0);
  }
  return date;
}
