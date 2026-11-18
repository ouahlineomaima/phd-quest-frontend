import { MeetingStatus } from '../../shared/models/domain.enums';
import { Injectable, effect, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import type { Meeting } from './meeting.models';
import { watchMeetingTime } from './meeting-time-state';
@Injectable()
export class MeetingClock {
  private readonly document = inject(DOCUMENT);
  readonly now = signal(Date.now());
  connect(meetings: () => readonly Meeting[], onBoundary: () => void): void {
    effect((onCleanup) => {
      const snapshot = meetings();
      const window = this.document.defaultView;
      if (!window) return;
      let previous = Date.now();
      const publish = (at: number) => {
        const crossed = snapshot.some(
          (m) =>
            m.status === MeetingStatus.Scheduled &&
            Date.parse(m.scheduledAt) >= Math.min(previous, at) &&
            Date.parse(m.scheduledAt) < Math.max(previous, at),
        );
        previous = at;
        this.now.set(at);
        if (crossed) onBoundary();
      };
      const sync = () => publish(Date.now());
      const stop = watchMeetingTime(() => snapshot, publish, {
        now: () => Date.now(),
        set: (work, delay) => window.setTimeout(work, delay),
        clear: (handle) => window.clearTimeout(handle as number),
      });
      window.addEventListener('focus', sync);
      this.document.addEventListener('visibilitychange', sync);
      onCleanup(() => {
        stop();
        window.removeEventListener('focus', sync);
        this.document.removeEventListener('visibilitychange', sync);
      });
    });
  }
}
