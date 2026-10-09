import { Location } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { routes } from './app.routes';
import { authGuard, guestGuard } from './core/auth/auth.guards';

describe('app routes', () => {
  function ownerShell() {
    return routes.find((route) => route.path === '' && Array.isArray(route.children));
  }

  it('exposes /scan without an authentication guard', () => {
    const scan = routes.find((route) => route.path === 'scan');

    expect(scan).toBeTruthy();
    expect(scan?.canActivate).toBeUndefined();
    expect(scan?.canMatch).toBeUndefined();
  });

  it('keeps the owner area behind authGuard', () => {
    expect(ownerShell()?.canActivate).toEqual([authGuard]);
    const childPaths = ownerShell()?.children?.map((route) => route.path) ?? [];
    expect(childPaths).toContain('cars');
    expect(childPaths).toContain('cars/new');
    expect(childPaths).toContain('cars/:carId');
  });

  it('keeps login and register behind guestGuard', () => {
    expect(routes.find((route) => route.path === 'login')?.canActivate).toEqual([guestGuard]);
    expect(routes.find((route) => route.path === 'register')?.canActivate).toEqual([guestGuard]);
  });

  it('keeps public sticker lookup unauthenticated', () => {
    expect(routes.find((route) => route.path === 'c/:token')?.canActivate).toBeUndefined();
    expect(routes.find((route) => route.path === 'r/:trackingRef')?.canActivate).toBeUndefined();
  });

  it('navigates to /scan without requiring a session', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient()],
    });

    const router = TestBed.inject(Router);
    const location = TestBed.inject(Location);

    await router.navigateByUrl('/scan');

    expect(router.url).toBe('/scan');
    expect(location.path()).toBe('/scan');
  });
});
