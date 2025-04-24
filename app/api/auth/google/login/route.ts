import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export async function GET(req: NextRequest) {
  // Get redirect_uri from query params if present
  const url = new URL(req.url);
  const redirectUri = url.searchParams.get("redirect_uri");

  // Google OAuth configuration
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUrl = `${
    process.env.NEXT_PUBLIC_URL || "http://localhost:3000"
  }/api/auth/google/callback`;

  // Generate state for CSRF protection
  const state = {
    csrfToken: uuidv4(),
    redirectUri: redirectUri, // Save redirect_uri in state
  };

  // Serialize state to string
  const stateStr = JSON.stringify(state);

  // Prepare the OAuth URL
  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.append("client_id", clientId as string);
  googleAuthUrl.searchParams.append("redirect_uri", redirectUrl);
  googleAuthUrl.searchParams.append("response_type", "code");
  googleAuthUrl.searchParams.append("scope", "openid email profile");
  googleAuthUrl.searchParams.append("state", stateStr);

  // Create response with state cookie
  const response = NextResponse.redirect(googleAuthUrl.toString());
  response.cookies.set("googleAuthState", stateStr, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600, // 10 minutes
    sameSite: "lax",
    path: "/", // Ensure cookie is accessible on the callback path
  });

  return response;
}
