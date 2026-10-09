import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PagedResult } from '../models/api.models';
import {
  ParkingRequest,
  ParkingRequestFilter,
  ParkingResponseType,
} from '../models/parking-request.models';

@Injectable({ providedIn: 'root' })
export class ParkingRequestsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/parking-requests`;

  list(
    filter: ParkingRequestFilter = {},
    page = 1,
    pageSize = 20,
  ): Observable<PagedResult<ParkingRequest>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);

    if (filter.status) {
      params = params.set('status', filter.status);
    }

    if (filter.carId) {
      params = params.set('carId', filter.carId);
    }

    return this.http.get<PagedResult<ParkingRequest>>(this.baseUrl, { params });
  }

  /** Fetching a request also marks it as seen on the server. */
  getById(requestId: string): Observable<ParkingRequest> {
    return this.http.get<ParkingRequest>(`${this.baseUrl}/${requestId}`);
  }

  respond(requestId: string, responseType: ParkingResponseType): Observable<ParkingRequest> {
    return this.http.post<ParkingRequest>(`${this.baseUrl}/${requestId}/respond`, {
      responseType,
    });
  }

  resolve(requestId: string): Observable<ParkingRequest> {
    return this.http.post<ParkingRequest>(`${this.baseUrl}/${requestId}/resolve`, {});
  }
}
