import { NextRequest, NextResponse } from "next/server";
import { generateSecurePassword } from "@/app/utils/fake";

// Get environment variables
const AUTH_API_URL = process.env.AUTH_API_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  try {
    const { email, googleId } = await req.json();

    if (!email || !googleId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Generate a secure random password that meets requirements
    const userPassword = generateSecurePassword();

    // Get JWT token from any-auth using password grant
    const tokenGrantResponse = await fetch(`${AUTH_API_URL}/oauth2/token`, {
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

    if (!tokenGrantResponse.ok) {
      // If login fails with the generated password, we might need to register the user
      const registerResponse = await fetch(
        `${AUTH_API_URL}/v1/users/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            username: `google_${email
              .split("@")[0]
              .replace(/[^a-zA-Z0-9_-]/g, "_")}_${Date.now()
              .toString()
              .slice(-6)}`,
            email: email,
            password: userPassword,
            metadata: {
              google_id: googleId,
              auth_provider: "google",
            },
          }),
        }
      );

      if (!registerResponse.ok) {
        return NextResponse.json(
          { error: "Failed to register user" },
          { status: 500 }
        );
      }

      // Try again with the new account
      const retryTokenResponse = await fetch(`${AUTH_API_URL}/oauth2/token`, {
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

      if (!retryTokenResponse.ok) {
        return NextResponse.json(
          { error: "Failed to authenticate after registration" },
          { status: 500 }
        );
      }

      const tokens = await retryTokenResponse.json();

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

    const tokens = await tokenGrantResponse.json();

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
