import {
  RefreshTokenGrantRequest,
  TokenResponse,
  TokenRevocationRequest,
} from "../types/auth";

/**
 * Refreshes the access token using a refresh token
 * @param refreshToken The refresh token to use
 * @returns A Promise with the new token response
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<TokenResponse> {
  const apiUrl =
    process.env.NEXT_PUBLIC_AUTH_API_URL || "http://localhost:8000";
  const clientId = process.env.NEXT_PUBLIC_CLIENT_ID || "any-login";
  const clientSecret = process.env.NEXT_PUBLIC_CLIENT_SECRET || "";
  const basicAuth = btoa(`${clientId}:${clientSecret}`);

  // Create request body
  const requestBody: RefreshTokenGrantRequest = {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId, // Keep for type compatibility
  };

  // Convert to Record<string, string> for URLSearchParams
  const formData: Record<string, string> = {
    grant_type: requestBody.grant_type,
    refresh_token: requestBody.refresh_token,
    // client_id removed from body and sent in the header instead
  };

  const response = await fetch(`${apiUrl}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`, // Add Basic Auth header
    },
    body: new URLSearchParams(formData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.error_description ||
        `Token refresh failed: ${response.statusText}`
    );
  }

  const data: TokenResponse = await response.json();
  return data;
}

/**
 * Revokes a token (either access or refresh token)
 * @param token The token to revoke
 * @param tokenType The type of token (access_token or refresh_token)
 * @returns A Promise that resolves when the token is revoked
 */
export async function revokeToken(
  token: string,
  tokenType: "access_token" | "refresh_token"
): Promise<void> {
  const apiUrl =
    process.env.NEXT_PUBLIC_AUTH_API_URL || "http://localhost:8000";
  const clientId = process.env.NEXT_PUBLIC_CLIENT_ID || "any-login";
  const clientSecret = process.env.NEXT_PUBLIC_CLIENT_SECRET || "";
  const basicAuth = btoa(`${clientId}:${clientSecret}`);

  // Create request body
  const requestBody: TokenRevocationRequest = {
    token,
    token_type_hint: tokenType,
    client_id: clientId, // Keep for type compatibility
  };

  // Convert to Record<string, string> for URLSearchParams
  const formData: Record<string, string> = {
    token: requestBody.token,
    token_type_hint: requestBody.token_type_hint ?? "",
    // client_id removed from body and sent in the header instead
  };

  const response = await fetch(`${apiUrl}/oauth2/revoke`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`, // Add Basic Auth header
    },
    body: new URLSearchParams(formData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.error_description ||
        `Token revocation failed: ${response.statusText}`
    );
  }
}

/**
 * Handles a complete logout by revoking both access and refresh tokens
 */
export async function logout(): Promise<void> {
  const accessToken = localStorage.getItem("accessToken");
  const refreshToken = localStorage.getItem("refreshToken");

  try {
    if (accessToken) {
      await revokeToken(accessToken, "access_token");
    }

    if (refreshToken) {
      await revokeToken(refreshToken, "refresh_token");
    }
  } finally {
    // Clear tokens from localStorage regardless of API success
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  }
}
