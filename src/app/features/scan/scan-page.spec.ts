import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { OfficialScan } from '../../core/models/public-scan.models';
import { QrCameraService } from '../../core/qr/qr-camera.service';
import { ScanPage } from './scan-page';

const TOKEN = 'AbcdefghijkLMNOP12345-';
const OFFICIAL_URL = `https://qrcar.pages.dev/c/${TOKEN}`;
const SCAN_ID = 'scan-grant-1';

const recognised: OfficialScan = {
  scanId: SCAN_ID,
  maskedPhone: '+20 ••• ••• 1234',
  shareLocation: false,
  lastLatitude: null,
  lastLongitude: null,
  lastLocatedAtUtc: null,
  acceptsRequests: true,
};

describe('ScanPage', () => {
  let fixture: ComponentFixture<ScanPage>;
  let page: ScanPage;
  let router: jasmine.SpyObj<Router>;
  let camera: jasmine.SpyObj<QrCameraService>;
  let http: HttpTestingController;

  beforeEach(async () => {
    router = jasmine.createSpyObj('Router', ['navigate']);
    router.navigate.and.resolveTo(true);

    camera = jasmine.createSpyObj('QrCameraService', ['isSupported', 'start', 'stop']);
    camera.isSupported.and.returnValue(true);
    camera.start.and.resolveTo();
    camera.stop.and.resolveTo();

    await TestBed.configureTestingModule({
      imports: [ScanPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
        { provide: QrCameraService, useValue: camera },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ScanPage);
    page = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  it('does not request the camera until the user presses Start scanning', () => {
    expect(camera.start).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Start scanning');
  });

  it('validates an official Tala3ny URL with the server and never opens that URL', async () => {
    const pending = page.onDecoded(OFFICIAL_URL);
    const request = http.expectOne(`${environment.apiBaseUrl}/public/scans`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ token: TOKEN });
    request.flush(recognised);
    await pending;
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Recognised Tala3ny code');
    expect(text).toContain(recognised.maskedPhone);
    expect(text).toContain('Call');
    expect(text).toContain('WhatsApp');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('validates a bare public token the same way', async () => {
    const pending = page.onDecoded(TOKEN);
    http.expectOne(`${environment.apiBaseUrl}/public/scans`).flush(recognised);
    await pending;
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Recognised Tala3ny code');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('rejects an external QR without calling the API or navigating', async () => {
    await page.onDecoded(`https://evil.example/c/${TOKEN}`);

    expect(router.navigate).not.toHaveBeenCalled();
    expect(page['errorMessage']()).toBe('This is not a valid Tala3ny QR code.');
  });

  it('does not validate twice for the same valid scan', async () => {
    const first = page.onDecoded(OFFICIAL_URL);
    http.expectOne(`${environment.apiBaseUrl}/public/scans`).flush(recognised);
    await first;

    await page.onDecoded(OFFICIAL_URL);
    await page.onDecoded(TOKEN);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('keeps unknown and revoked codes rejected', async () => {
    const missing = page.onDecoded(OFFICIAL_URL);
    http.expectOne(`${environment.apiBaseUrl}/public/scans`).flush(
      { title: 'Not found' },
      { status: 404, statusText: 'Not Found' },
    );
    await missing;
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain("isn't recognised");
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain(recognised.maskedPhone);

    page.resetResult();
    const retired = page.onDecoded(TOKEN);
    http.expectOne(`${environment.apiBaseUrl}/public/scans`).flush(
      { title: 'Gone' },
      { status: 410, statusText: 'Gone' },
    );
    await retired;
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('no longer active');
  });

  it('shows a clear message when camera permission is denied', async () => {
    camera.start.and.rejectWith(new DOMException('Denied', 'NotAllowedError'));

    await page.startScanning();
    fixture.detectChanges();

    expect(page['errorMessage']()).toContain('Camera permission was denied');
    expect(page['scanning']()).toBeFalse();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('stops the camera when the user cancels', async () => {
    await page.startScanning();
    camera.stop.calls.reset();

    await page.stopScanning();

    expect(camera.stop).toHaveBeenCalled();
    expect(page['scanning']()).toBeFalse();
  });

  it('stops the camera when the component is destroyed', () => {
    camera.stop.calls.reset();
    fixture.destroy();
    expect(camera.stop).toHaveBeenCalled();
  });
});
