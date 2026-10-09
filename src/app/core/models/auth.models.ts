export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  phoneNumber: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthUserSummary {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresAtUtc: string;
  user: AuthUserSummary;
}

/** What we keep in local storage between visits. */
export interface StoredSession {
  accessToken: string;
  expiresAtUtc: string;
  user: AuthUserSummary;
}
