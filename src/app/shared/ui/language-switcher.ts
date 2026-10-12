import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { Locale } from '../../core/i18n/translations';

@Component({
  selector: 'app-language-switcher',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (tone() === 'pills') {
      <div
        class="flex items-center gap-1 rounded-full bg-surface-container-high p-0.5 shadow-sm"
        role="group"
        aria-label="Language"
      >
        <button
          type="button"
          class="rounded-full px-3 py-1 text-[10px] font-bold tracking-wide transition-all"
          [class]="
            locale() === 'en'
              ? 'bg-surface-container-lowest text-on-surface shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          "
          (click)="set('en')"
        >
          English
        </button>
        <button
          type="button"
          class="rounded-full px-3 py-1 text-[10px] font-bold tracking-wide transition-all"
          [class]="
            locale() === 'ar'
              ? 'bg-surface-container-lowest text-on-surface shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          "
          (click)="set('ar')"
        >
          العربية
        </button>
      </div>
    } @else if (tone() === 'dark') {
      <div class="flex items-center gap-1 text-sm font-semibold" role="group" aria-label="Language">
        <button
          type="button"
          class="rounded px-1.5 py-0.5 transition"
          [class]="locale() === 'en' ? 'text-primary-container' : 'text-white/75 hover:text-white'"
          (click)="set('en')"
        >
          EN
        </button>
        <span class="text-white/35">|</span>
        <button
          type="button"
          class="rounded px-1.5 py-0.5 transition"
          [class]="locale() === 'ar' ? 'text-primary-container' : 'text-white/75 hover:text-white'"
          (click)="set('ar')"
        >
          العربية
        </button>
      </div>
    } @else {
      <div
        class="flex w-full overflow-hidden rounded-xl border border-slate-200 bg-white text-sm font-semibold"
        role="group"
        aria-label="Language"
      >
        <button
          type="button"
          class="flex-1 px-3 py-2 transition"
          [class]="locale() === 'en' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50'"
          (click)="set('en')"
        >
          English
        </button>
        <button
          type="button"
          class="flex-1 px-3 py-2 transition"
          [class]="locale() === 'ar' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50'"
          (click)="set('ar')"
        >
          العربية
        </button>
      </div>
    }
  `,
})
export class LanguageSwitcher {
  private readonly i18n = inject(I18nService);
  readonly tone = input<'light' | 'dark' | 'pills'>('light');
  protected readonly locale = this.i18n.locale;

  protected set(locale: Locale): void {
    this.i18n.setLocale(locale);
  }
}
