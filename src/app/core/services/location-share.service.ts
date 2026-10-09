import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { UsersApiService } from '../api/users-api.service';

const MIN_INTERVAL_MS = 20_000;
const MIN_DISTANCE_METERS = 25;

/**
 * Reports the signed-in owner's position while they have sharing on and this tab is open.
 * A closed or powered-off phone cannot be queried — this only stores the last successful ping.
 */
@Injectable({ providedIn: 'root' })
export class LocationShareService {
  private readonly usersApi = inject(UsersApiService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private watchId: number | null = null;
  private lastSentAt = 0;
  private lastLat: number | null = null;
  private lastLng: number | null = null;

  start(): void {
    if (!this.isBrowser || !('geolocation' in navigator) || this.watchId !== null) {
      return;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.maybeSend(position.coords.latitude, position.coords.longitude),
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 },
    );
  }

  stop(): void {
    if (!this.isBrowser || this.watchId === null) {
      return;
    }

    navigator.geolocation.clearWatch(this.watchId);
    this.watchId = null;
  }

  private maybeSend(latitude: number, longitude: number): void {
    const now = Date.now();
    const movedFarEnough =
      this.lastLat === null ||
      this.distanceMeters(this.lastLat, this.lastLng ?? longitude, latitude, longitude) >=
        MIN_DISTANCE_METERS;

    if (!movedFarEnough && now - this.lastSentAt < MIN_INTERVAL_MS) {
      return;
    }

    this.lastSentAt = now;
    this.lastLat = latitude;
    this.lastLng = longitude;

    this.usersApi.updateMyLocation({ latitude, longitude }).subscribe({
      error: () => undefined,
    });
  }

  private distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const earth = 6_371_000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * earth * Math.asin(Math.min(1, Math.sqrt(a)));
  }
}
