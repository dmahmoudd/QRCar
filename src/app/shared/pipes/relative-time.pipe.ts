import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

@Pipe({ name: 'relativeTime', pure: false })
export class RelativeTimePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(value: string | Date | null | undefined): string {
    if (!value) {
      return '';
    }

    const then = value instanceof Date ? value : new Date(value);
    const elapsed = Date.now() - then.getTime();

    if (Number.isNaN(elapsed) || elapsed < MINUTE) {
      return this.i18n.t('time.justNow');
    }

    if (elapsed < HOUR) {
      return this.i18n.t('time.minutesAgo', { count: Math.floor(elapsed / MINUTE) });
    }

    if (elapsed < DAY) {
      const hours = Math.floor(elapsed / HOUR);
      return hours === 1
        ? this.i18n.t('time.hourAgo')
        : this.i18n.t('time.hoursAgo', { count: hours });
    }

    const days = Math.floor(elapsed / DAY);
    if (days < 30) {
      return days === 1
        ? this.i18n.t('time.yesterday')
        : this.i18n.t('time.daysAgo', { count: days });
    }

    return then.toLocaleDateString(this.i18n.dateLocale());
  }
}
