import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { I18nService } from '../../core/i18n/i18n.service';

type ChipStyle = { icon: string; classes: string; label: string };

const STATUS_STYLES: Record<string, Omit<ChipStyle, 'label'>> = {
  Pending: {
    icon: 'notifications_active',
    classes: 'bg-accent-50 text-brand-600 ring-accent-100',
  },
  Seen: {
    icon: 'visibility',
    classes: 'bg-sky-100 text-sky-900 ring-sky-200',
  },
  Acknowledged: {
    icon: 'directions_run',
    classes: 'bg-emerald-100 text-emerald-900 ring-emerald-200',
  },
  Resolved: {
    icon: 'check_circle',
    classes: 'bg-slate-100 text-slate-700 ring-slate-200',
  },
  Expired: {
    icon: 'hourglass_disabled',
    classes: 'bg-rose-100 text-rose-900 ring-rose-200',
  },
};

@Component({
  selector: 'app-status-chip',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './status-chip.html',
})
export class StatusChip {
  private readonly i18n = inject(I18nService);

  readonly status = input.required<string>();

  /** Optional override when the surrounding copy needs different wording. */
  readonly label = input<string>('');

  protected readonly style = computed<ChipStyle>(() => {
    this.i18n.locale();
    const base = STATUS_STYLES[this.status()];
    if (!base) {
      return {
        icon: 'help_outline',
        classes: 'bg-slate-100 text-slate-700 ring-slate-200',
        label: this.status(),
      };
    }

    return { ...base, label: this.i18n.status(this.status()) };
  });
}
