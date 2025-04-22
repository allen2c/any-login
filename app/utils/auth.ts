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
  // Create request body
  const requestBody: RefreshTokenGrantRequest = {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  };

  // Convert to Record<string, string> for URLSearchParams
  const formData: Record<string, string> = {
    grant_type: requestBody.grant_type,
    refresh_token: requestBody.refresh_token,
  };

  const response = await fetch(`/api/auth/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
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
  // Create request body
  const requestBody: TokenRevocationRequest = {
    token,
    token_type_hint: tokenType,
  };

  // Convert to Record<string, string> for URLSearchParams
  const formData: Record<string, string> = {
    token: requestBody.token,
    token_type_hint: requestBody.token_type_hint ?? "",
  };

  const response = await fetch(`/api/auth/oauth2/revoke`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
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
 * Handles logout by calling the internal API endpoint which clears HttpOnly cookies.
 */
export async function logout(): Promise<void> {
  try {
    // Call the dedicated logout endpoint
    const response = await fetch("/api/auth/logout", {
      method: "POST",
    });

    if (!response.ok) {
      console.error("Logout API call failed:", response.statusText);
    } else {
      console.log("Logout successful via API");
    }
  } catch (error) {
    console.error("Error during logout API call:", error);
  }
}
