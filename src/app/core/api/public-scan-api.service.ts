import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateParkingRequestPayload,
  ParkingReasonOption,
  ParkingRequestCreated,
  PublicCar,
  PublicRequestStatus,
} from '../models/public-scan.models';

/**
 * Anonymous endpoints used by whoever scanned the sticker. The auth interceptor skips these
 * URLs on purpose, so no bearer token is ever sent here.
 */
@Injectable({ providedIn: 'root' })
export class PublicScanApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/public`;

  getReasons(): Observable<ParkingReasonOption[]> {
    return this.http.get<ParkingReasonOption[]>(`${this.baseUrl}/reasons`);
  }

  getCarByToken(token: string): Observable<PublicCar> {
    return this.http.get<PublicCar>(`${this.baseUrl}/cars/${encodeURIComponent(token)}`);
  }

  callUrl(token: string): string {
    return `${this.baseUrl}/cars/${encodeURIComponent(token)}/call`;
  }

  whatsAppUrl(token: string): string {
    return `${this.baseUrl}/cars/${encodeURIComponent(token)}/whatsapp`;
  }

  createRequest(
    token: string,
    payload: CreateParkingRequestPayload,
  ): Observable<ParkingRequestCreated> {
    return this.http.post<ParkingRequestCreated>(
      `${this.baseUrl}/cars/${encodeURIComponent(token)}/requests`,
      payload,
    );
  }

  getRequestStatus(trackingRef: string): Observable<PublicRequestStatus> {
    return this.http.get<PublicRequestStatus>(
      `${this.baseUrl}/requests/${encodeURIComponent(trackingRef)}`,
    );
  }
}
