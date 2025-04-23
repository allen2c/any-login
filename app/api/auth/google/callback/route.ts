import { NextRequest, NextResponse } from "next/server";
import { generateSecurePassword } from "@/app/utils/fake";

// Get environment variables
const AUTH_API_URL = process.env.AUTH_API_URL || "http://localhost:8000";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID as string;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET as string;
const REDIRECT_URI = `${
  process.env.NEXT_PUBLIC_URL || "http://localhost:3000"
}/api/auth/google/callback`;

export async function GET(req: NextRequest) {
  try {
    // Extract code and verify state
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    console.log(
      "[Google OAuth] Received callback with code:",
      code,
      "and state:",
      state
    );

    // Verify state from cookie to prevent CSRF
    const storedState = req.cookies.get("googleAuthState")?.value;
    if (!state || state !== storedState) {
      console.warn(
        "[Google OAuth] Invalid state. Received:",
        state,
        "Expected:",
        storedState
      );
      return NextResponse.redirect(
        new URL("/login?error=invalid_state", req.url)
      );
    }

    // Clear state cookie
    const response = NextResponse.redirect(new URL("/", req.url));
    response.cookies.delete("googleAuthState");

    if (!code) {
      console.warn("[Google OAuth] No code found in callback.");
      return NextResponse.redirect(new URL("/login?error=no_code", req.url));
    }

    // Step 1: Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      console.error(
        "[Google OAuth] Google token error:",
        await tokenResponse.text()
      );
      return NextResponse.redirect(
        new URL("/login?error=token_exchange_failed", req.url)
      );
    }

    const tokenData = await tokenResponse.json();
    console.log("[Google OAuth] Token data received:", tokenData);

    // Step 2: Get user info with the token
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      }
    );

    if (!userInfoResponse.ok) {
      console.error("[Google OAuth] Failed to fetch user info.");
      return NextResponse.redirect(
        new URL("/login?error=userinfo_failed", req.url)
      );
    }

    const googleUser = await userInfoResponse.json();
    console.log("[Google OAuth] Google user info:", googleUser);

    // Step 3: Check if user exists in any-auth
    // Note: If the endpoint doesn't exist you'll need to implement it in your backend
    const checkUserResponse = await fetch(
      `${AUTH_API_URL}/v1/users/check?email=${encodeURIComponent(
        googleUser.email
      )}`,
      { headers: getAuthHeaders() }
    );

    let userExists = false;

    if (checkUserResponse.ok) {
      const checkData = await checkUserResponse.json();
      userExists = checkData.exists;
      console.log("[Google OAuth] User existence check:", checkData);
    } else {
      console.warn(
        "[Google OAuth] User existence check failed with status:",
        checkUserResponse.status
      );
    }

    if (userExists) {
      // For existing users, redirect to the special Google login page
      // This allows us to handle existing users separately
      console.log(
        "[Google OAuth] User exists, redirecting to /google-login for:",
        googleUser.email
      );
      return NextResponse.redirect(
        new URL(
          `/google-login?email=${encodeURIComponent(
            googleUser.email
          )}&id=${encodeURIComponent(googleUser.sub)}`,
          req.url
        )
      );
    }

    // For new users, generate a secure password that meets requirements
    const userPassword = generateSecurePassword();
    console.log("[Google OAuth] Registering new user:", googleUser.email);

    // Step 4: Register the new user
    const registerResponse = await fetch(`${AUTH_API_URL}/v1/users/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        username: `google_${googleUser.email
          .split("@")[0]
          .replace(/[^a-zA-Z0-9_-]/g, "_")}_${Date.now().toString().slice(-6)}`,
        email: googleUser.email,
        password: userPassword,
        full_name: googleUser.name,
        picture: googleUser.picture,
        metadata: {
          google_id: googleUser.sub,
          auth_provider: "google",
        },
      }),
    });

    if (!registerResponse.ok) {
      console.error(
        "[Google OAuth] Registration failed:",
        await registerResponse.text()
      );
      return NextResponse.redirect(
        new URL("/login?error=registration_failed", req.url)
      );
    }

    console.log(
      "[Google OAuth] Registration successful for:",
      googleUser.email
    );

    // Step 5: Get JWT token from any-auth using password grant
    const tokenGrantResponse = await fetch(`${AUTH_API_URL}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...getAuthHeaders(),
      },
      body: new URLSearchParams({
        grant_type: "password",
        username: googleUser.email,
        password: userPassword,
        scope: "openid profile email",
      }),
    });

    if (!tokenGrantResponse.ok) {
      console.error(
        "[Google OAuth] Token acquisition failed:",
        await tokenGrantResponse.text()
      );
      return NextResponse.redirect(
        new URL("/login?error=token_acquisition_failed", req.url)
      );
    }

    const tokens = await tokenGrantResponse.json();
    console.log("[Google OAuth] JWT tokens acquired for:", googleUser.email);

    // Step 6: Set tokens in HttpOnly cookies and redirect
    const redirectResponse = NextResponse.redirect(new URL("/", req.url));

    if (tokens.access_token) {
      redirectResponse.cookies.set({
        name: "accessToken",
        value: tokens.access_token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: tokens.expires_in || 3600,
        sameSite: "lax",
      });
      console.log(
        "[Google OAuth] Set accessToken cookie for:",
        googleUser.email
      );
    }

    if (tokens.refresh_token) {
      redirectResponse.cookies.set({
        name: "refreshToken",
        value: tokens.refresh_token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 7 * 24 * 60 * 60, // 7 days
        sameSite: "lax",
      });
      console.log(
        "[Google OAuth] Set refreshToken cookie for:",
        googleUser.email
      );
    }

    // Add a script to store Google token in sessionStorage
    // We'll use this for the new "google" grant type
    const redirectUrl = new URL(
      `/google-login?email=${encodeURIComponent(
        googleUser.email
      )}&id=${encodeURIComponent(googleUser.sub)}`,
      req.url
    ).toString();

    const storeTokenScript = `
      <script>
        try {
          sessionStorage.setItem("googleAccessToken", "${tokenData.access_token}");
          window.location.href = "${redirectUrl}";
        } catch (e) {
          console.error("Failed to store token:", e);
          window.location.href = "${redirectUrl}";
        }
      </script>
    `;

    // Instead of redirecting directly, we'll return HTML with a script
    // that stores the token, then redirects
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Google Authentication</title>
        </head>
        <body>
          <p>Completing authentication...</p>
          ${storeTokenScript}
        </body>
      </html>`,
      {
        headers: {
          "Content-Type": "text/html",
        },
      }
    );
  } catch (error) {
    console.error("[Google OAuth] Google OAuth error:", error);
    return NextResponse.redirect(new URL("/login?error=oauth_failed", req.url));
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
