export interface Car {
  id: string;
  plateNumber: string;
  countryCode: string;
  make: string;
  model: string;
  color: string;
  nickname: string | null;
  isActive: boolean;
  qrVersion: number;
  scanCount: number;
  lastScannedAtUtc: string | null;
  createdAtUtc: string;
}

export interface CreateCarRequest {
  nickname: string | null;
}

export interface UpdateCarRequest {
  nickname: string | null;
  isActive: boolean;
}

export interface QrCode {
  carId: string;
  publicToken: string;
  /** The exact string encoded in the printed QR image. */
  scanUrl: string;
  qrVersion: number;
  scanCount: number;
  lastScannedAtUtc: string | null;
}

export type QrImageFormat = 'Png' | 'Svg';
