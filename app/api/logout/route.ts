import { NextRequest, NextResponse } from "next/server";

const ANY_LOGIN_URL = process.env.ANY_LOGIN_URL || "http://localhost:3000";

export async function POST(request: NextRequest) {
  try {
    // Forward the request with all cookies to any-login's logout endpoint
    const response = await fetch(`${ANY_LOGIN_URL}/api/auth/logout`, {
      method: "POST",
      headers: {
        // Forward all cookies from the request
        Cookie: request.headers.get("cookie") || "",
      },
    });

    if (!response.ok) {
      console.warn("Failed to logout from any-login:", response.statusText);
    }
  } catch (error) {
    console.error("Error during logout:", error);
  }

  // Create response and clear cookies
  const response = NextResponse.json({ success: true });

  // Clear cookies on the any-me domain
  response.cookies.delete("accessToken");
  response.cookies.delete("refreshToken");

  return response;
}
