import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { PublicCar } from '../../core/models/public-scan.models';
import { ScanLanding } from './scan-landing';

const TOKEN = 'AbcdefghijkLMNOP12345-';

const activeCar: PublicCar = {
  maskedPhone: '+20 ••• ••• 1234',
  shareLocation: false,
  lastLatitude: null,
  lastLongitude: null,
  lastLocatedAtUtc: null,
  acceptsRequests: true,
};

describe('ScanLanding', () => {
  let fixture: ComponentFixture<ScanLanding>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScanLanding],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ScanLanding);
    fixture.componentRef.setInput('token', TOKEN);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  it('shows a recognised Tala3ny code after the server accepts it', () => {
    http
      .expectOne(`${environment.apiBaseUrl}/public/cars/${TOKEN}`)
      .flush(activeCar);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Recognised Tala3ny code');
    expect(text).toContain('does not prove');
    expect(text).toContain(activeCar.maskedPhone);
  });

  it('shows an unrecognized state for 404 without exposing extra details', () => {
    http.expectOne(`${environment.apiBaseUrl}/public/cars/${TOKEN}`).flush(
      { title: 'Not found' },
      { status: 404, statusText: 'Not Found' },
    );
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain("This code isn't recognised");
    expect(text).not.toContain('1234');
  });

  it('hides contact options when the owner has paused the code', () => {
    http.expectOne(`${environment.apiBaseUrl}/public/cars/${TOKEN}`).flush({
      ...activeCar,
      acceptsRequests: false,
    });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('not accepting contact');
    expect(text).not.toContain('WhatsApp');
  });
});
