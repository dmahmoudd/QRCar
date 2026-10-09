import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PagedResult } from '../models/api.models';
import {
  Car,
  CreateCarRequest,
  QrCode,
  QrImageFormat,
  UpdateCarRequest,
} from '../models/car.models';

@Injectable({ providedIn: 'root' })
export class CarsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/cars`;

  list(page = 1, pageSize = 20): Observable<PagedResult<Car>> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<PagedResult<Car>>(this.baseUrl, { params });
  }

  getById(carId: string): Observable<Car> {
    return this.http.get<Car>(`${this.baseUrl}/${carId}`);
  }

  create(request: CreateCarRequest): Observable<Car> {
    return this.http.post<Car>(this.baseUrl, request);
  }

  update(carId: string, request: UpdateCarRequest): Observable<Car> {
    return this.http.put<Car>(`${this.baseUrl}/${carId}`, request);
  }

  delete(carId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${carId}`);
  }

  getQrCode(carId: string): Observable<QrCode> {
    return this.http.get<QrCode>(`${this.baseUrl}/${carId}/qr`);
  }

  rotateQrCode(carId: string): Observable<QrCode> {
    return this.http.post<QrCode>(`${this.baseUrl}/${carId}/qr/rotate`, {});
  }

  /**
   * The image endpoint requires the bearer token, so it cannot be used directly as an
   * `<img src>`. Fetching it as a blob lets the interceptor authenticate the request and
   * lets the component turn the result into an object URL.
   */
  getQrImage(carId: string, format: QrImageFormat = 'Png', size = 512): Observable<Blob> {
    const params = new HttpParams().set('format', format).set('size', size);

    return this.http.get(`${this.baseUrl}/${carId}/qr/image`, {
      params,
      responseType: 'blob',
    });
  }
}
