import { BreakpointObserver } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';
import { UsersApiService } from '../core/api/users-api.service';
import { AuthService } from '../core/auth/auth.service';
import { LocationShareService } from '../core/services/location-share.service';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/scan', label: 'Scan QR', icon: 'qr_code_scanner' },
  { path: '/dashboard', label: 'Dashboard', icon: 'space_dashboard' },
  { path: '/cars', label: 'My cars', icon: 'directions_car' },
  { path: '/requests', label: 'Requests', icon: 'notifications' },
  { path: '/profile', label: 'Profile', icon: 'person' },
];

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
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

  protected readonly navItems = NAV_ITEMS;
  protected readonly user = this.auth.user;
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
    this.locationShare.stop();
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}
