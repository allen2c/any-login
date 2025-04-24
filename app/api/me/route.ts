import { NextRequest, NextResponse } from "next/server";

const ANY_LOGIN_URL = process.env.ANY_LOGIN_URL || "http://localhost:3000";

export async function GET(request: NextRequest) {
  try {
    // Log the incoming authorization header
    const authHeader = request.headers.get("Authorization");
    console.log(
      "api/me received Authorization Header:",
      authHeader ? "Present" : "Missing"
    );

    // Prepare headers for the request to any-login
    const headers: HeadersInit = {};

    // Forward Authorization header if present
    if (authHeader) {
      headers["Authorization"] = authHeader;
      console.log("api/me extracted Access Token:", "Present");
    } else {
      console.log("api/me: No Authorization header found in request");
    }

    // Forward cookies as fallback authentication method
    if (request.headers.get("cookie")) {
      headers["Cookie"] = request.headers.get("cookie") || "";
    }

    // Forward the request to any-login's userinfo endpoint
    const response = await fetch(`${ANY_LOGIN_URL}/api/auth/oauth2/userinfo`, {
      headers,
    });

    if (!response.ok) {
      // If any-login returns an error, forward it
      const errorData = await response.json().catch(() => ({}));
      console.error(
        "Error from userinfo endpoint:",
        response.status,
        errorData
      );
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
