import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
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
  template: `
    <mat-sidenav-container class="min-h-screen bg-slate-50">
      <mat-sidenav
        class="w-64 border-r border-slate-200"
        [mode]="isHandset() ? 'over' : 'side'"
        [opened]="isHandset() ? drawerOpen() : true"
        (closedStart)="drawerOpen.set(false)"
      >
        <div class="flex items-center gap-2 px-5 py-5">
          <mat-icon class="text-brand-600">qr_code_2</mat-icon>
          <span class="font-semibold tracking-tight text-slate-800">Park Ping</span>
        </div>

        <mat-nav-list>
          @for (item of navItems; track item.path) {
            <a
              mat-list-item
              [routerLink]="item.path"
              routerLinkActive
              #link="routerLinkActive"
              [activated]="link.isActive"
              (click)="closeOnMobile()"
            >
              <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
              <span matListItemTitle>{{ item.label }}</span>
            </a>
          }
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content class="flex min-h-screen flex-col">
        <mat-toolbar class="border-b border-slate-200 bg-white">
          @if (isHandset()) {
            <button mat-icon-button aria-label="Open menu" (click)="drawerOpen.set(!drawerOpen())">
              <mat-icon>menu</mat-icon>
            </button>
          }

          <span class="flex-1"></span>

          <button mat-button [matMenuTriggerFor]="accountMenu">
            <mat-icon>account_circle</mat-icon>
            <span class="ml-1 hidden sm:inline">{{ user()?.fullName }}</span>
          </button>

          <mat-menu #accountMenu="matMenu">
            <div class="px-4 py-2">
              <p class="text-sm font-medium text-slate-800">{{ user()?.fullName }}</p>
              <p class="text-xs text-slate-500">{{ user()?.email }}</p>
            </div>
            <mat-divider />
            <button mat-menu-item routerLink="/profile">
              <mat-icon>person</mat-icon>
              <span>Profile</span>
            </button>
            <button mat-menu-item (click)="signOut()">
              <mat-icon>logout</mat-icon>
              <span>Sign out</span>
            </button>
          </mat-menu>
        </mat-toolbar>

        <main class="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
          <router-outlet />
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
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
   * Defaults to false so the server-rendered pass assumes a desktop layout; the real value
   * arrives as soon as the browser can measure the viewport.
   */
  protected readonly isHandset = toSignal(
    this.breakpoints.observe(Breakpoints.Handset).pipe(map((state) => state.matches)),
    { initialValue: false },
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
