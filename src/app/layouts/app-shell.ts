import { BreakpointObserver } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatSidenavModule } from '@angular/material/sidenav';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';
import { UsersApiService } from '../core/api/users-api.service';
import { AuthService } from '../core/auth/auth.service';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { IncomingRequestAlertService } from '../core/services/incoming-request-alert.service';
import { LocationShareService } from '../core/services/location-share.service';
import { BrandLogo } from '../shared/ui/brand-logo';
import { LanguageSwitcher } from '../shared/ui/language-switcher';

interface NavItem {
  path: string;
  labelKey: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/scan', labelKey: 'nav.scan', icon: 'qr_code_scanner' },
  { path: '/cars', labelKey: 'nav.cars', icon: 'directions_car' },
  { path: '/requests', labelKey: 'nav.requests', icon: 'notifications' },
  { path: '/profile', labelKey: 'nav.profile', icon: 'person' },
];

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatBadgeModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
    TranslatePipe,
    LanguageSwitcher,
    BrandLogo,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app-shell.html',
})
export class AppShell {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly usersApi = inject(UsersApiService);
  private readonly locationShare = inject(LocationShareService);
  private readonly incomingAlerts = inject(IncomingRequestAlertService);

  protected readonly navItems = NAV_ITEMS;
  protected readonly user = this.auth.user;
  protected readonly pendingCount = this.incomingAlerts.pendingCount;
  protected readonly drawerOpen = signal(false);

  /**
   * Read the real viewport on the first client paint so a desktop window does not
   * open as a phone drawer and then snap.
   */
  protected readonly isHandset = toSignal(
    this.breakpoints.observe('(max-width: 767.98px)').pipe(map((state) => state.matches)),
    {
      initialValue:
        typeof matchMedia === 'function' && matchMedia('(max-width: 767.98px)').matches,
    },
  );

  constructor() {
    if (this.auth.isAuthenticated()) {
      this.incomingAlerts.start();
      this.usersApi.getMyProfile().subscribe({
        next: (profile) => {
          if (profile.shareLocation) {
            this.locationShare.start();
          }
        },
        error: () => undefined,
      });
    }
  }

  protected closeOnMobile(): void {
    if (this.isHandset()) {
      this.drawerOpen.set(false);
    }
  }

  protected signOut(): void {
    this.incomingAlerts.stop();
    this.locationShare.stop();
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}
