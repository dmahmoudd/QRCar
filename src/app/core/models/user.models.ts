export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  /** Only ever returned for the signed-in user themselves. */
  phoneNumber: string;
  role: string;
  createdAtUtc: string;
  carCount: number;
  shareLocation: boolean;
  lastLatitude: number | null;
  lastLongitude: number | null;
  lastLocatedAtUtc: string | null;
}

export interface UpdateProfileRequest {
  fullName: string;
  phoneNumber: string;
  shareLocation: boolean;
}

export interface UpdateLocationRequest {
  latitude: number;
  longitude: number;
}
