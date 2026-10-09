import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateParkingRequestPayload,
  OfficialScan,
  ParkingReasonOption,
  ParkingRequestCreated,
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

  createOfficialScan(token: string): Observable<OfficialScan> {
    return this.http.post<OfficialScan>(`${this.baseUrl}/scans`, { token });
  }

  callUrl(scanId: string): string {
    return `${this.baseUrl}/scans/${encodeURIComponent(scanId)}/call`;
  }

  whatsAppUrl(scanId: string): string {
    return `${this.baseUrl}/scans/${encodeURIComponent(scanId)}/whatsapp`;
  }

  createRequest(
    scanId: string,
    payload: CreateParkingRequestPayload,
  ): Observable<ParkingRequestCreated> {
    return this.http.post<ParkingRequestCreated>(
      `${this.baseUrl}/scans/${encodeURIComponent(scanId)}/requests`,
      payload,
    );
  }

  getRequestStatus(trackingRef: string): Observable<PublicRequestStatus> {
    return this.http.get<PublicRequestStatus>(
      `${this.baseUrl}/requests/${encodeURIComponent(trackingRef)}`,
    );
  }
}
