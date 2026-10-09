import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router, RouterLink, RouterOutlet } from '@angular/router';
import { routes } from '../../app.routes';
import { environment } from '../../../environments/environment';
import { ScanLanding } from './scan-landing';

const TOKEN = 'AbcdefghijkLMNOP12345-';

@Component({
  selector: 'app-landing-host',
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
class LandingHost {}

describe('ScanLanding', () => {
  let fixture: ComponentFixture<ScanLanding>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScanLanding],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ScanLanding);
    fixture.componentRef.setInput('token', TOKEN);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  it('shows the scanner landing and never displays vehicle or contact details', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain(
      'To verify this Tala3ny QR code and access contact options, use the official Tala3ny scanner.',
    );
    expect(text).toContain('Open Tala3ny Scanner');
    expect(text).not.toContain('Call');
    expect(text).not.toContain('WhatsApp');
    expect(text).not.toContain('Last location');
    expect(text).not.toContain('masked');
    expect(text).not.toContain('1234');
    expect(text).not.toContain('+20');
  });

  it('links to the official website scanner without starting the camera', () => {
    const link = fixture.debugElement.query(By.directive(RouterLink));
    const href = (link.nativeElement as HTMLAnchorElement).getAttribute('href');

    expect(environment.officialScannerPath).toBe('/scan');
    expect(href).toBe('/scan');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Start scanning');
  });

  it('does not call the public cars API', () => {
    expect(http.match((request) => request.url.includes('/public/cars/')).length).toBe(0);
    expect(http.match((request) => request.url.includes('/public/scans')).length).toBe(0);
  });
});

describe('ScanLanding route', () => {
  it('shows the landing for /c/:token even with ?fromApp=true and links to /scan', async () => {
    TestBed.configureTestingModule({
      imports: [LandingHost],
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });

    const fixture = TestBed.createComponent(LandingHost);
    const router = TestBed.inject(Router);
    const http = TestBed.inject(HttpTestingController);

    await router.navigateByUrl(`/c/${TOKEN}?fromApp=true`);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(router.url).toBe(`/c/${TOKEN}?fromApp=true`);
    expect(text).toContain('use the official Tala3ny scanner');
    expect(text).toContain('Open Tala3ny Scanner');
    expect(text).not.toContain('WhatsApp');
    expect(text).not.toContain('Last location');
    expect(fixture.nativeElement.querySelector('a[href="/scan"]')).toBeTruthy();
    http.expectNone((request) => request.url.includes('/public/cars/'));
    http.verify();
  });
});
