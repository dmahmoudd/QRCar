export type ParkingRequestStatus = 'Pending' | 'Seen' | 'Acknowledged' | 'Resolved' | 'Expired';

export type ParkingResponseType = 'OnMyWay' | 'CantMoveNow' | 'NotMyCar' | 'Ignored';

export interface ParkingRequest {
  id: string;
  carId: string;
  carPlate: string;
  carLabel: string;
  reason: string;
  reasonLabel: string;
  message: string | null;
  status: ParkingRequestStatus;
  responseType: ParkingResponseType | null;
  createdAtUtc: string;
  seenAtUtc: string | null;
  respondedAtUtc: string | null;
  expiresAtUtc: string;
}

export interface RespondToParkingRequest {
  responseType: ParkingResponseType;
}

export interface ParkingRequestFilter {
  status?: ParkingRequestStatus;
  carId?: string;
}

/** Labels and icons for the reply buttons the owner sees. */
export const RESPONSE_OPTIONS: ReadonlyArray<{
  value: ParkingResponseType;
  label: string;
  icon: string;
}> = [
  { value: 'OnMyWay', label: "I'm on my way", icon: 'directions_run' },
  { value: 'CantMoveNow', label: "I can't move it now", icon: 'schedule' },
  { value: 'NotMyCar', label: 'This is not my car', icon: 'help_outline' },
  { value: 'Ignored', label: 'Dismiss', icon: 'block' },
];
