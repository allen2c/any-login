import { NextRequest, NextResponse } from "next/server";

// Get the any-auth base URL from environment variables
const AUTH_API_URL = process.env.AUTH_API_URL || "http://localhost:8000";

// Helper function to get client credentials
function getBasicAuthHeader(): string | undefined {
  const clientId = process.env.BACKEND_CLIENT_ID;
  const clientSecret = process.env.BACKEND_CLIENT_SECRET;
  if (clientId && clientSecret) {
    return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString(
      "base64"
    )}`;
  }
  // Fallback to public client creds if needed
  const publicClientId = process.env.NEXT_PUBLIC_CLIENT_ID;
  const publicClientSecret = process.env.NEXT_PUBLIC_CLIENT_SECRET;
  if (publicClientId && publicClientSecret) {
    return `Basic ${Buffer.from(
      `${publicClientId}:${publicClientSecret}`
    ).toString("base64")}`;
  }
  return undefined;
}

async function handler(
  req: NextRequest,
  { params }: { params: { slug: string[] } }
) {
  const slug = params.slug.join("/");
  const targetUrl = `${AUTH_API_URL}/${slug}`;

  // Get tokens from request cookies
  const accessToken = req.cookies.get("accessToken")?.value;

  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("cookie");

  // Add Authorization header if required by the specific any-auth endpoint
  if (slug === "oauth2/userinfo" && accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  } else if (
    slug === "oauth2/token" ||
    slug === "oauth2/revoke" ||
    slug === "v1/users/register"
  ) {
    const basicAuth = getBasicAuthHeader();
    if (basicAuth) {
      headers.set("Authorization", basicAuth);
    } else {
      console.warn(`Client credentials not configured for slug: ${slug}`);
    }
  } else {
    headers.delete("Authorization");
  }

  try {
    // Special handling for form data needed for /token and /revoke
    let body: BodyInit | null | undefined = req.body;

    if (
      (slug === "oauth2/token" || slug === "oauth2/revoke") &&
      req.headers
        .get("content-type")
        ?.includes("application/x-www-form-urlencoded")
    ) {
      const formData = await req.formData();
      const params = new URLSearchParams();
      formData.forEach((value, key) => {
        params.append(key, value.toString());
      });
      body = params;
      headers.set("Content-Type", "application/x-www-form-urlencoded");
    } else if (req.body) {
      body = await req.arrayBuffer();
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: body,
      redirect: "manual",
    });

    // Handle token responses specifically to store tokens in HttpOnly cookies
    if (slug === "oauth2/token" && response.ok) {
      const tokenData = await response.json();
      const responseHeaders = new Headers(response.headers);
      responseHeaders.delete("set-cookie");

      // Create response to return
      const nextResponse = NextResponse.json(tokenData, {
        status: response.status,
        headers: responseHeaders,
      });

      // Set HttpOnly cookies for tokens
      if (tokenData.access_token) {
        const isSecure = process.env.NODE_ENV === "production";
        nextResponse.cookies.set({
          name: "accessToken",
          value: tokenData.access_token,
          httpOnly: true,
          secure: isSecure,
          path: "/",
          maxAge: tokenData.expires_in || 3600,
          sameSite: "lax",
        });
      }
      if (tokenData.refresh_token) {
        const isSecure = process.env.NODE_ENV === "production";
        const refreshTokenMaxAge = 7 * 24 * 60 * 60; // 7 days
        nextResponse.cookies.set({
          name: "refreshToken",
          value: tokenData.refresh_token,
          httpOnly: true,
          secure: isSecure,
          path: "/",
          maxAge: refreshTokenMaxAge,
          sameSite: "lax",
        });
      }

      return nextResponse;
    } else if (slug === "oauth2/revoke" && response.ok) {
      // Clear cookies on successful revocation
      const nextResponse = new NextResponse(null, { status: response.status });
      nextResponse.cookies.delete("accessToken");
      nextResponse.cookies.delete("refreshToken");
      return nextResponse;
    }

    // For other requests, proxy the response body and status directly
    const responseBody = await response.arrayBuffer();
    const responseHeaders = new Headers(response.headers);
    if (response.headers.get("content-type")) {
      responseHeaders.set(
        "content-type",
        response.headers.get("content-type")!
      );
    }

    return new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`Error proxying request to ${targetUrl}:`, error);
    return NextResponse.json(
      {
        error: "Proxy error",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 }
    );
  }
}

// Export methods for GET, POST, PUT, DELETE, etc.
export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as DELETE,
  handler as PATCH,
};
