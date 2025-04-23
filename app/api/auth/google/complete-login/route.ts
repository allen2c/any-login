import { NextRequest, NextResponse } from "next/server";
import { generateSecurePassword } from "@/app/utils/fake";

// Get environment variables
const AUTH_API_URL = process.env.AUTH_API_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  try {
    const { email, googleId, googleToken } = await req.json();

    if (!email || !googleId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // First, try to use the new "google" grant type
    // This will handle both new users and existing users automatically on the backend
    const tokenResponse = await fetch(`${AUTH_API_URL}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...getAuthHeaders(),
      },
      body: new URLSearchParams({
        grant_type: "google",
        email,
        google_id: googleId,
        google_token: googleToken || "", // If not available, send empty string
        scope: "openid profile email",
      }),
    });

    // If the backend supports the new grant type, we're done
    if (tokenResponse.ok) {
      const tokens = await tokenResponse.json();

      // Set tokens in cookies
      const response = NextResponse.json({ success: true });

      if (tokens.access_token) {
        response.cookies.set({
          name: "accessToken",
          value: tokens.access_token,
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: tokens.expires_in || 3600,
          sameSite: "lax",
        });
      }

      if (tokens.refresh_token) {
        response.cookies.set({
          name: "refreshToken",
          value: tokens.refresh_token,
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 7 * 24 * 60 * 60, // 7 days
          sameSite: "lax",
        });
      }

      return response;
    }

    // If the backend doesn't support the new grant type yet,
    // fall back to the previous behavior for backward compatibility

    // Check if user exists
    const userCheckResponse = await fetch(
      `${AUTH_API_URL}/v1/users/check?email=${encodeURIComponent(email)}`,
      { headers: getAuthHeaders() }
    );

    const userExists =
      userCheckResponse.ok && (await userCheckResponse.json()).exists;

    if (userExists) {
      // For existing users, return a more helpful message
      return NextResponse.json(
        {
          error: "Account already exists",
          message:
            "This email is already registered. Please log in with your password first, then link your Google account from your profile.",
        },
        { status: 400 }
      );
    }

    // Only proceed with registration for new users
    const userPassword = generateSecurePassword();

    // Register the new user
    const registerResponse = await fetch(`${AUTH_API_URL}/v1/users/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        username: `google_${email
          .split("@")[0]
          .replace(/[^a-zA-Z0-9_-]/g, "_")}_${Date.now().toString().slice(-6)}`,
        email: email,
        password: userPassword,
        metadata: {
          google_id: googleId,
          auth_provider: "google",
        },
      }),
    });

    if (!registerResponse.ok) {
      return NextResponse.json(
        { error: "Failed to register user" },
        { status: 500 }
      );
    }

    // Get auth token for the newly registered user
    const fallbackTokenResponse = await fetch(`${AUTH_API_URL}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...getAuthHeaders(),
      },
      body: new URLSearchParams({
        grant_type: "password",
        username: email,
        password: userPassword,
        scope: "openid profile email",
      }),
    });

    if (!fallbackTokenResponse.ok) {
      return NextResponse.json(
        { error: "Failed to authenticate after registration" },
        { status: 500 }
      );
    }

    const fallbackTokens = await fallbackTokenResponse.json();

    // Set tokens in cookies
    const fallbackResponse = NextResponse.json({ success: true });

    if (fallbackTokens.access_token) {
      fallbackResponse.cookies.set({
        name: "accessToken",
        value: fallbackTokens.access_token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: fallbackTokens.expires_in || 3600,
        sameSite: "lax",
      });
    }

    if (fallbackTokens.refresh_token) {
      fallbackResponse.cookies.set({
        name: "refreshToken",
        value: fallbackTokens.refresh_token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 7 * 24 * 60 * 60, // 7 days
        sameSite: "lax",
      });
    }

    return fallbackResponse;
  } catch (error) {
    console.error("Complete login error:", error);
    return NextResponse.json(
      { error: "Failed to complete login" },
      { status: 500 }
    );
  }
}

// Helper to get authorization headers for any-auth API
function getAuthHeaders(): Record<string, string> {
  const clientId = process.env.BACKEND_CLIENT_ID;
  const clientSecret = process.env.BACKEND_CLIENT_SECRET;

  if (clientId && clientSecret) {
    return {
      Authorization: `Basic ${Buffer.from(
        `${clientId}:${clientSecret}`
      ).toString("base64")}`,
    };
  }

  return {};
}
