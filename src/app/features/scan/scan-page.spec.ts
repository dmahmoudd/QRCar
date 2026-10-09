import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { QrCameraService } from '../../core/qr/qr-camera.service';
import { ScanPage } from './scan-page';

const TOKEN = 'AbcdefghijkLMNOP12345-';
const OFFICIAL_URL = `https://qrcar.pages.dev/c/${TOKEN}`;

describe('ScanPage', () => {
  let fixture: ComponentFixture<ScanPage>;
  let page: ScanPage;
  let router: jasmine.SpyObj<Router>;
  let camera: jasmine.SpyObj<QrCameraService>;
  let http: HttpClient;

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

    http = TestBed.inject(HttpClient);
    spyOn(http, 'get').and.callThrough();
    spyOn(http, 'post').and.callThrough();

    fixture = TestBed.createComponent(ScanPage);
    page = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('navigates internally for an official Tala3ny URL and never opens that URL', async () => {
    await page.onDecoded(OFFICIAL_URL);

    expect(router.navigate).toHaveBeenCalledOnceWith(['/c', TOKEN]);
    expect(http.get).not.toHaveBeenCalled();
    expect(http.post).not.toHaveBeenCalled();
  });

  it('navigates internally for a bare public token', async () => {
    await page.onDecoded(TOKEN);

    expect(router.navigate).toHaveBeenCalledOnceWith(['/c', TOKEN]);
    expect(http.get).not.toHaveBeenCalled();
  });

  it('rejects an external QR without calling the API or navigating', async () => {
    await page.onDecoded(`https://evil.example/c/${TOKEN}`);

    expect(router.navigate).not.toHaveBeenCalled();
    expect(http.get).not.toHaveBeenCalled();
    expect(page['errorMessage']()).toBe('This is not a valid Tala3ny QR code.');
  });

  it('does not navigate twice for the same valid scan', async () => {
    await page.onDecoded(OFFICIAL_URL);
    await page.onDecoded(OFFICIAL_URL);
    await page.onDecoded(TOKEN);

    expect(router.navigate).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(['/c', TOKEN]);
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
    camera.start.and.callFake(async (video, onText) => {
      expect(video).toBeTruthy();
      onText(TOKEN);
    });

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
