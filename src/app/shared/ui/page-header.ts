import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: block;
    }

    @media (max-width: 767.98px) {
      .page-header-actions > * {
        flex: 1 1 calc(50% - 0.25rem);
        min-width: 0;
      }
    }
  `,
  templateUrl: './page-header.html',
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input('');
}
