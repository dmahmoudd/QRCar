export interface ParkingReasonOption {
  code: string;
  label: string;
  requiresMessage: boolean;
}

export interface PublicCar {
  maskedPhone: string;
  shareLocation: boolean;
  lastLatitude: number | null;
  lastLongitude: number | null;
  lastLocatedAtUtc: string | null;
  acceptsRequests: boolean;
}

export interface OfficialScan extends PublicCar {
  scanId: string;
}

export interface PublicBrowserAccess {
  requiresOfficialApp: boolean;
}

export interface CreateParkingRequestPayload {
  reason: string;
  message: string | null;
}

export interface ParkingRequestCreated {
  trackingRef: string;
  createdAtUtc: string;
  expiresAtUtc: string;
}

export interface PublicRequestStatus {
  trackingRef: string;
  status: string;
  responseType: string | null;
  responseLabel: string | null;
  createdAtUtc: string;
  respondedAtUtc: string | null;
}
