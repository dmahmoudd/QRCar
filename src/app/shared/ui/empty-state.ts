import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-empty-state',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div class="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
        <mat-icon class="!h-7 !w-7 !text-3xl">{{ icon() }}</mat-icon>
      </div>
      <h3 class="text-lg font-semibold text-slate-800">{{ title() }}</h3>
      @if (description()) {
        <p class="max-w-sm text-sm text-slate-500">{{ description() }}</p>
      }
      <ng-content />
    </div>
  `,
})
export class EmptyState {
  readonly icon = input('inbox');
  readonly title = input.required<string>();
  readonly description = input('');
}
