import type { ActiveFocusSession } from './focus-api';
export function leaseExpired(row: ActiveFocusSession, sinceResponseMs: number): boolean {
  return (
    !row.leaseUntil ||
    Date.parse(row.serverNow) + sinceResponseMs >= Date.parse(row.leaseUntil) ||
    !row.activityUntil ||
    Date.parse(row.serverNow) + sinceResponseMs >= Date.parse(row.activityUntil)
  );
}
export function displayedSeconds(row: ActiveFocusSession, sinceResponseMs: number): number {
  const expired = leaseExpired(row, sinceResponseMs);
  const milliseconds =
    row.state !== 'running' || expired
      ? row.confirmedMilliseconds
      : row.elapsedMilliseconds + sinceResponseMs;
  return Math.floor(Math.min((row.targetSeconds ?? 604800) * 1000, milliseconds) / 1000);
}
export function otherTabsPresent(timestamps: number[], now: number): boolean {
  return timestamps.some((stamp) => Number.isFinite(stamp) && stamp <= now && now - stamp < 12000);
}
