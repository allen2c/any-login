import { NextRequest, NextResponse } from "next/server";

const ANY_LOGIN_URL = process.env.ANY_LOGIN_URL || "http://localhost:3000";

export async function GET(request: NextRequest) {
  try {
    // Forward the request with all cookies to any-login's userinfo endpoint
    const response = await fetch(`${ANY_LOGIN_URL}/api/auth/oauth2/userinfo`, {
      headers: {
        // Forward all cookies from the request
        Cookie: request.headers.get("cookie") || "",
      },
    });

    if (!response.ok) {
      // If any-login returns an error, forward it
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        errorData.detail ? errorData : { error: response.statusText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching user info:", error);
    return NextResponse.json(
      { error: "Failed to fetch user info" },
      { status: 500 }
    );
  }
}
