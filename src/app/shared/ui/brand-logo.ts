import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-brand-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <img
      src="/brand-logo.png"
      width="160"
      height="160"
      alt="طلعني"
      [class]="markOnly() ? markClass() : fullClass()"
    />
  `,
})
export class BrandLogo {
  readonly markOnly = input(false);
  readonly markClass = input('h-10 w-10 object-contain');
  readonly fullClass = input('h-12 w-12 object-contain');
}
