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
        title: 'routes.scanLanding',
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
        title: 'routes.requestStatus',
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
        title: 'routes.scan',
        loadComponent: () => import('./features/scan/scan-page').then((m) => m.ScanPage),
      },
    ],
  },

  {
    path: 'login',
    title: 'routes.login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login').then((m) => m.Login),
  },
  {
    path: 'register',
    title: 'routes.register',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register').then((m) => m.Register),
  },
  {
    path: 'forgot-password',
    title: 'routes.forgotPassword',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/forgot-password').then((m) => m.ForgotPassword),
  },
  {
    path: 'reset-password',
    title: 'routes.resetPassword',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/reset-password').then((m) => m.ResetPassword),
  },

  {
    path: '',
    loadComponent: () => import('./layouts/app-shell').then((m) => m.AppShell),
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', redirectTo: 'cars', pathMatch: 'full' },
      {
        path: 'cars',
        title: 'routes.cars',
        loadComponent: () => import('./features/cars/car-list').then((m) => m.CarList),
      },
      {
        path: 'cars/new',
        title: 'routes.carNew',
        loadComponent: () => import('./features/cars/car-form').then((m) => m.CarForm),
      },
      {
        path: 'cars/:carId',
        title: 'routes.car',
        loadComponent: () => import('./features/cars/car-detail').then((m) => m.CarDetail),
      },
      {
        path: 'cars/:carId/edit',
        title: 'routes.carEdit',
        loadComponent: () => import('./features/cars/car-form').then((m) => m.CarForm),
      },
      {
        path: 'requests',
        title: 'routes.requests',
        loadComponent: () =>
          import('./features/requests/request-inbox').then((m) => m.RequestInbox),
      },
      {
        path: 'requests/:requestId',
        title: 'routes.request',
        loadComponent: () =>
          import('./features/requests/request-detail').then((m) => m.RequestDetail),
      },
      {
        path: 'profile',
        title: 'routes.profile',
        loadComponent: () => import('./features/profile/profile').then((m) => m.Profile),
      },
    ],
  },

  { path: '**', redirectTo: 'cars' },
];
