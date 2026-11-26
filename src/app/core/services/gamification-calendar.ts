// Calendar presentation only. Qualifying activity and streaks remain server calculations.
export function calendarDate(at: number, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
}

export function nextDateBoundary(at: number, timezone: string): number {
  const date = calendarDate(at, timezone);
  let low = at,
    high = at + 27 * 60 * 60 * 1000;
  // Include 23/25-hour local dates and avoid assuming a fixed UTC offset.
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (calendarDate(middle, timezone) === date) low = middle;
    else high = middle;
  }
  return high;
}
