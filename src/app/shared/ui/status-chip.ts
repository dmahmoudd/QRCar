import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

type ChipStyle = { icon: string; classes: string; label: string };

const STATUS_STYLES: Record<string, ChipStyle> = {
  Pending: {
    icon: 'notifications_active',
    classes: 'bg-amber-100 text-amber-900 ring-amber-200',
    label: 'Waiting for you',
  },
  Seen: {
    icon: 'visibility',
    classes: 'bg-sky-100 text-sky-900 ring-sky-200',
    label: 'Seen',
  },
  Acknowledged: {
    icon: 'directions_run',
    classes: 'bg-emerald-100 text-emerald-900 ring-emerald-200',
    label: 'Replied',
  },
  Resolved: {
    icon: 'check_circle',
    classes: 'bg-slate-100 text-slate-700 ring-slate-200',
    label: 'Resolved',
  },
  Expired: {
    icon: 'hourglass_disabled',
    classes: 'bg-rose-100 text-rose-900 ring-rose-200',
    label: 'Expired',
  },
};

@Component({
  selector: 'app-status-chip',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset"
      [class]="style().classes"
    >
      <mat-icon class="!h-4 !w-4 !text-base leading-none">{{ style().icon }}</mat-icon>
      {{ label() || style().label }}
    </span>
  `,
})
export class StatusChip {
  readonly status = input.required<string>();

  /** Optional override when the surrounding copy needs different wording. */
  readonly label = input<string>('');

  protected readonly style = computed<ChipStyle>(
    () =>
      STATUS_STYLES[this.status()] ?? {
        icon: 'help_outline',
        classes: 'bg-slate-100 text-slate-700 ring-slate-200',
        label: this.status(),
      },
  );
}
