import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guards';

/*
 * Both layouts are lazily loaded so the initial download carries neither. It matters most for
 * the scan pages: a stranger standing next to a car should not pay for the owner-side shell,
 * its sidenav, toolbar and menus.
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },

  /*
   * Anonymous scan flow. These are declared as their own top-level routes rather than as
   * children of one empty-path layout route so that matching stays unambiguous.
   */
  {
    path: 'c/:token',
    loadComponent: () => import('./layouts/public-layout').then((m) => m.PublicLayout),
    children: [
      {
        path: '',
        title: 'Contact the owner',
        loadComponent: () =>
          import('./features/public-scan/scan-landing').then((m) => m.ScanLanding),
      },
    ],
  },
  {
    path: 'r/:trackingRef',
    loadComponent: () => import('./layouts/public-layout').then((m) => m.PublicLayout),
    children: [
      {
        path: '',
        title: 'Your request',
        loadComponent: () =>
          import('./features/public-scan/request-status').then((m) => m.RequestStatus),
      },
    ],
  },
  {
    path: 'scan',
    loadComponent: () => import('./layouts/public-layout').then((m) => m.PublicLayout),
    children: [
      {
        path: '',
        title: 'Scan QR',
        loadComponent: () => import('./features/scan/scan-page').then((m) => m.ScanPage),
      },
    ],
  },

  {
    path: 'login',
    title: 'Sign in',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login').then((m) => m.Login),
  },
  {
    path: 'register',
    title: 'Create an account',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register').then((m) => m.Register),
  },

  {
    path: '',
    loadComponent: () => import('./layouts/app-shell').then((m) => m.AppShell),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        title: 'Dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'cars',
        title: 'My cars',
        loadComponent: () => import('./features/cars/car-list').then((m) => m.CarList),
      },
      {
        path: 'cars/new',
        title: 'Add a car',
        loadComponent: () => import('./features/cars/car-form').then((m) => m.CarForm),
      },
      {
        path: 'cars/:carId',
        title: 'Car',
        loadComponent: () => import('./features/cars/car-detail').then((m) => m.CarDetail),
      },
      {
        path: 'cars/:carId/edit',
        title: 'Edit car',
        loadComponent: () => import('./features/cars/car-form').then((m) => m.CarForm),
      },
      {
        path: 'requests',
        title: 'Requests',
        loadComponent: () =>
          import('./features/requests/request-inbox').then((m) => m.RequestInbox),
      },
      {
        path: 'requests/:requestId',
        title: 'Request',
        loadComponent: () =>
          import('./features/requests/request-detail').then((m) => m.RequestDetail),
      },
      {
        path: 'profile',
        title: 'Profile',
        loadComponent: () => import('./features/profile/profile').then((m) => m.Profile),
      },
    ],
  },

  { path: '**', redirectTo: 'dashboard' },
];
