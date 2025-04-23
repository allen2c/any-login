import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  // Google OAuth configuration
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${
    process.env.NEXT_PUBLIC_URL || "http://localhost:3000"
  }/api/auth/google/callback`;

  // Generate state for CSRF protection
  const state = uuidv4();

  // Prepare the OAuth URL
  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.append("client_id", clientId as string);
  googleAuthUrl.searchParams.append("redirect_uri", redirectUri);
  googleAuthUrl.searchParams.append("response_type", "code");
  googleAuthUrl.searchParams.append("scope", "openid email profile");
  googleAuthUrl.searchParams.append("state", state);

  // Create response with state cookie
  const response = NextResponse.redirect(googleAuthUrl.toString());
  response.cookies.set("googleAuthState", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600, // 10 minutes
    sameSite: "lax",
  });

  return response;
}
