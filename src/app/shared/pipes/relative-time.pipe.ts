import { Pipe, PipeTransform } from '@angular/core';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

@Pipe({ name: 'relativeTime' })
export class RelativeTimePipe implements PipeTransform {
  transform(value: string | Date | null | undefined): string {
    if (!value) {
      return '';
    }

    const then = value instanceof Date ? value : new Date(value);
    const elapsed = Date.now() - then.getTime();

    if (Number.isNaN(elapsed)) {
      return '';
    }

    if (elapsed < 0) {
      return 'just now';
    }

    if (elapsed < MINUTE) {
      return 'just now';
    }

    if (elapsed < HOUR) {
      const minutes = Math.floor(elapsed / MINUTE);
      return `${minutes} min ago`;
    }

    if (elapsed < DAY) {
      const hours = Math.floor(elapsed / HOUR);
      return hours === 1 ? 'an hour ago' : `${hours} hours ago`;
    }

    const days = Math.floor(elapsed / DAY);
    if (days < 30) {
      return days === 1 ? 'yesterday' : `${days} days ago`;
    }

    return then.toLocaleDateString();
  }
}
