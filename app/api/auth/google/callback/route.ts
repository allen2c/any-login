import { NextRequest, NextResponse } from "next/server";
import { generateSecurePassword } from "@/app/utils/fake";

// Get environment variables
const AUTH_API_URL = process.env.AUTH_API_URL || "http://localhost:8000";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID as string;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET as string;
const REDIRECT_URI = `${
  process.env.NEXT_PUBLIC_URL || "http://localhost:3000"
}/api/auth/google/callback`;

// Define the type for the state object
interface AuthState {
  csrfToken: string;
  redirectUri: string | null;
}

export async function GET(req: NextRequest) {
  try {
    // Extract code and state
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const receivedState = searchParams.get("state");

    console.log(
      "[Google OAuth] Received callback with code:",
      code,
      "and state:",
      receivedState
    );

    // Extract stored state from cookie
    const storedState = req.cookies.get("googleAuthState")?.value;

    if (!storedState || !receivedState) {
      console.warn("[Google OAuth] Missing state");
      return NextResponse.redirect(
        new URL("/login?error=invalid_state", req.url)
      );
    }

    // Parse the JSON state strings
    let parsedStoredState: AuthState;
    let parsedReceivedState: AuthState;
    let clientRedirectUri: string | null = null;

    try {
      parsedStoredState = JSON.parse(storedState);
      parsedReceivedState = JSON.parse(receivedState);

      // Check if state is valid (CSRF protection)
      if (parsedStoredState.csrfToken !== parsedReceivedState.csrfToken) {
        console.warn("[Google OAuth] CSRF state mismatch.");
        return NextResponse.redirect(
          new URL("/login?error=invalid_state", req.url)
        );
      }

      // Extract redirect_uri from state
      clientRedirectUri = parsedStoredState.redirectUri;
    } catch (e) {
      console.error("[Google OAuth] Failed to parse state:", e);
      return NextResponse.redirect(
        new URL("/login?error=invalid_state_format", req.url)
      );
    }

    // Clear state cookie
    const clearCookieResponse = NextResponse.next();
    clearCookieResponse.cookies.delete("googleAuthState");

    if (!code) {
      console.warn("[Google OAuth] No code found in callback.");
      return NextResponse.redirect(new URL("/login?error=no_code", req.url));
    }

    // Step 1: Exchange code for Google tokens
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

    // If user doesn't exist, register them
    let userPassword = "";
    if (!userExists) {
      // Generate a secure password for the user
      // This is just for the first login - user can change it later
      userPassword = generateSecurePassword();

      // Register the user in any-auth
      console.log(
        `[Google OAuth] Registering new user: ${googleUser.email} with Google ID: ${googleUser.sub}`
      );

      const registerData = {
        email: googleUser.email,
        password: userPassword,
        username: googleUser.email.split("@")[0],
        // Optional profile data from Google
        full_name: googleUser.name,
        google_id: googleUser.sub,
        picture: googleUser.picture,
      };

      const registerResponse = await fetch(
        `${AUTH_API_URL}/v1/users/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify(registerData),
        }
      );

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
    } else {
      console.log("[Google OAuth] User already exists:", googleUser.email);
    }

    // Step 4: Get JWT token from any-auth using specialized Google grant type
    // This is a custom grant type that we recommend implementing in any-auth
    console.log("[Google OAuth] Exchanging Google token for any-auth token");

    const tokenGrantResponse = await fetch(`${AUTH_API_URL}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...getAuthHeaders(),
      },
      body: new URLSearchParams({
        grant_type: "google", // Custom grant type for Google
        email: googleUser.email,
        google_id: googleUser.sub,
        google_token: tokenData.access_token,
        scope: "openid profile email",
      }),
    });

    // If the custom grant type is not implemented, fall back to password grant
    let tokens;
    if (!tokenGrantResponse.ok) {
      console.warn(
        "[Google OAuth] Google grant not supported, falling back to password grant:",
        await tokenGrantResponse.text()
      );

      if (!userExists || !userPassword) {
        return NextResponse.redirect(
          new URL("/login?error=login_failed", req.url)
        );
      }

      const fallbackTokenResponse = await fetch(
        `${AUTH_API_URL}/oauth2/token`,
        {
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
        }
      );

      if (!fallbackTokenResponse.ok) {
        console.error(
          "[Google OAuth] Token acquisition failed:",
          await fallbackTokenResponse.text()
        );
        return NextResponse.redirect(
          new URL("/login?error=token_acquisition_failed", req.url)
        );
      }

      tokens = await fallbackTokenResponse.json();
    } else {
      tokens = await tokenGrantResponse.json();
    }

    console.log("[Google OAuth] JWT tokens acquired for:", googleUser.email);

    // Step 5: If we have client redirect URI, redirect there with token
    if (clientRedirectUri) {
      console.log(
        `[Google OAuth] Redirecting to client app: ${clientRedirectUri}`
      );

      const redirectUrl = new URL(clientRedirectUri);
      redirectUrl.searchParams.set("token", tokens.access_token);

      // Clear state cookie and redirect to client app
      const redirectResponse = NextResponse.redirect(redirectUrl.toString());
      redirectResponse.cookies.delete("googleAuthState");

      return redirectResponse;
    }

    // Otherwise, set tokens in cookies and redirect to home
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

    return redirectResponse;
  } catch (error) {
    console.error("[Google OAuth] Callback error:", error);
    return NextResponse.redirect(new URL("/login?error=oauth_failed", req.url));
  }
}

// Helper function to get authorization headers
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
