import type { ActiveFocusSession } from './focus-api';
export function elapsedSinceResponse(monotonicDelta: number, wallDelta: number): number {
  // Some browsers suspend performance.now during computer sleep. Neither clock awards persisted time.
  return Math.max(0, monotonicDelta, wallDelta);
}
export function displayedSeconds(row: ActiveFocusSession, sinceResponseMs: number): number {
  const milliseconds =
    row.state === 'running'
      ? row.elapsedMilliseconds + Math.max(0, sinceResponseMs)
      : row.confirmedMilliseconds;
  return Math.floor(milliseconds / 1000);
}
