import { Dir } from '@angular/cdk/bidi';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { I18nService } from './core/i18n/i18n.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Dir],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly i18n = inject(I18nService);
  protected readonly dir = computed(() => (this.i18n.locale() === 'ar' ? 'rtl' : 'ltr'));
}
