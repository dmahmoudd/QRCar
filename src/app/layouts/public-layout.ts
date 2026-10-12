import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { BrandLogo } from '../shared/ui/brand-logo';
import { LanguageSwitcher } from '../shared/ui/language-switcher';

/**
 * Chrome for the anonymous scan pages. No owner-app menus — only a Scan entry so a
 * stranger can open the in-app camera without signing in.
 */
@Component({
  selector: 'app-public-layout',
  imports: [RouterOutlet, RouterLink, MatIconModule, TranslatePipe, LanguageSwitcher, BrandLogo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './public-layout.html',
})
export class PublicLayout {}
