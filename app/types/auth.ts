/**
 * API interaction types between any-login and any-auth
 */

/**
 * User information returned from the userinfo endpoint
 */
export interface UserInfo {
  sub: string;
  name?: string;
  preferred_username?: string;
  email?: string;
  email_verified?: boolean;
  picture?: string;
  phone_number?: string;
  phone_number_verified?: boolean;
  address?: {
    formatted?: string;
  } | null;
  website?: string;
  gender?: string;
  birthdate?: string;
  zoneinfo?: string;
  locale?: string;
  updated_at?: number;
}

/**
 * Response when requesting an OAuth2 token
 */
export interface TokenResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
}

/**
 * Request body for the password grant type
 */
export interface PasswordGrantRequest {
  grant_type: "password";
  username: string; // Can be username or email
  password: string;
  scope?: string; // e.g., "openid profile email"
  client_id?: string; // Now optional, handled server-side
}

/**
 * Request body for the refresh token grant type
 */
export interface RefreshTokenGrantRequest {
  grant_type: "refresh_token";
  refresh_token: string;
  scope?: string;
  client_id?: string; // Optional, handled server-side
}

/**
 * Request body for the Google grant type
 */
export interface GoogleGrantRequest {
  grant_type: "google";
  email: string;
  google_id: string;
  google_token: string;
  scope?: string;
  client_id?: string; // Optional, handled server-side
}

/**
 * Request body for token revocation
 */
export interface TokenRevocationRequest {
  token: string;
  token_type_hint?: "access_token" | "refresh_token";
  client_id?: string; // Optional, handled server-side
  client_secret?: string; // Optional, handled server-side
}

/**
 * Request body for user registration
 */
export interface UserCreateRequest {
  username: string;
  full_name?: string;
  email: string;
  phone?: string;
  picture?: string;
  password: string;
  metadata?: Record<string, unknown>;
}

/**
 * Response after successfully registering a user
 */
export interface UserRegistrationResponse {
  id: string;
  username: string;
  full_name?: string;
  email: string;
  email_verified: boolean;
  phone?: string;
  phone_verified: boolean;
  disabled: boolean;
  profile: string;
  picture?: string;
  website: string;
  gender: string;
  birthdate: string;
  zoneinfo: string;
  locale: string;
  address: string;
  metadata: Record<string, unknown>;
  created_at: number;
  updated_at: number;
}
