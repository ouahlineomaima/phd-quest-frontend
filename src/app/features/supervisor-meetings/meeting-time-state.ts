import type { Meeting } from './meeting.models';
import { MeetingStatus } from '../../shared/models/domain.enums';
export function partitionMeetings(
  meetings: readonly Meeting[],
  now: number,
): { upcoming: Meeting[]; history: Meeting[] } {
  const upcoming: Meeting[] = [],
    history: Meeting[] = [];
  for (const meeting of meetings) {
    if (meeting.status === MeetingStatus.Scheduled && Date.parse(meeting.scheduledAt) >= now)
      upcoming.push(meeting);
    else history.push(meeting);
  }
  return { upcoming, history: history.reverse() };
}
export function nextMeetingDelay(meetings: readonly Meeting[], now: number): number {
  const future = meetings
    .filter((m) => m.status === MeetingStatus.Scheduled)
    .map((m) => Date.parse(m.scheduledAt))
    .filter((at) => at >= now);
  // Resync at most once per minute, and exactly at the next time boundary. This
  // also catches device sleep, background throttling and system clock changes.
  return Math.max(1, Math.min(60000, ...future.map((at) => at - now + 1)));
}
export interface ClockScheduler {
  now(): number;
  set(work: () => void, delay: number): unknown;
  clear(handle: unknown): void;
}
export function watchMeetingTime(
  meetings: () => readonly Meeting[],
  publish: (now: number) => void,
  scheduler: ClockScheduler,
): () => void {
  let timer: unknown;
  let stopped = false;
  const tick = () => {
    if (stopped) return;
    const now = scheduler.now();
    publish(now);
    timer = scheduler.set(tick, nextMeetingDelay(meetings(), now));
  };
  tick();
  return () => {
    stopped = true;
    scheduler.clear(timer);
  };
}
