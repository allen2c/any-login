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

  return undefined;
}

async function handler(
  req: NextRequest,
  { params }: { params: { slug: string[] } }
) {
  // Make sure params.slug is properly accessed in an async context
  const resolvedParams = await params;
  const slugArray = Array.isArray(resolvedParams.slug)
    ? resolvedParams.slug
    : [];
  const slug = slugArray.join("/");
  const targetUrl = `${AUTH_API_URL}/${slug}`;

  // Forward headers from the incoming request
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    // Don't forward host, connection, cookie or content-length headers
    if (
      !["host", "connection", "cookie", "content-length"].includes(
        key.toLowerCase()
      )
    ) {
      headers.append(key, value);
    }
  });

  // Get the incoming Authorization header (if any)
  const incomingAuthHeader = req.headers.get("Authorization");
  // Get tokens from request cookies
  const accessToken = req.cookies.get("accessToken")?.value;

  // Add Authorization header based on request type
  if (slug === "oauth2/userinfo" && incomingAuthHeader) {
    // IMPORTANT FIX: If it's a userinfo request AND we received an Auth header, forward THAT header
    headers.set("Authorization", incomingAuthHeader);
    console.log(`[Proxy /${slug}] Forwarding received Authorization header.`);
  } else if (slug === "oauth2/userinfo" && accessToken) {
    // Fallback to cookie-based token if no incoming Auth header
    headers.set("Authorization", `Bearer ${accessToken}`);
    console.log(`[Proxy /${slug}] Using accessToken from cookie.`);
  } else if (
    slug === "oauth2/token" ||
    slug === "oauth2/revoke" ||
    slug.startsWith("v1/users/register")
  ) {
    // For token, revoke, register: Use Basic Auth if configured
    const basicAuth = getBasicAuthHeader();
    if (basicAuth) {
      headers.set("Authorization", basicAuth);
      console.log(`[Proxy /${slug}] Using Basic Auth.`);
    } else {
      // Clear any potentially forwarded bearer token for these specific routes
      headers.delete("Authorization");
      console.warn(
        `[Proxy /${slug}] Client credentials not configured. No Auth header sent.`
      );
    }
  } else {
    // For other requests, clear any potentially forwarded Authorization header
    headers.delete("Authorization");
    console.log(`[Proxy /${slug}] Removed Authorization header.`);
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
      // Ensure correct content-type is set if we rebuilt the body
      headers.set("Content-Type", "application/x-www-form-urlencoded");
    } else if (req.body) {
      // Check if body exists before reading
      if (req.headers.get("content-length") !== "0") {
        try {
          body = await req.arrayBuffer();
        } catch (e) {
          // Handle cases where body might not be readable
          console.warn(`[Proxy /${slug}] Could not read request body:`, e);
          body = null;
        }
      } else {
        body = null; // Explicitly set body to null for GET/HEAD etc.
      }
    }

    console.log(`[Proxy /${slug}] Forwarding request to: ${targetUrl}`);

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: body,
      redirect: "manual",
    });

    console.log(
      `[Proxy /${slug}] Received response status: ${response.status} from ${targetUrl}`
    );

    // Handle token responses specifically to store tokens in HttpOnly cookies
    if (slug === "oauth2/token" && response.ok) {
      const tokenData = await response.json();
      const responseHeaders = new Headers(response.headers);
      responseHeaders.delete("set-cookie"); // Don't proxy set-cookie from backend

      // Create response to return
      const nextResponse = NextResponse.json(tokenData, {
        status: response.status,
        headers: responseHeaders,
      });

      // Set HttpOnly cookies for tokens
      const isSecure = process.env.NODE_ENV === "production";
      const refreshTokenMaxAge = 7 * 24 * 60 * 60; // 7 days

      if (tokenData.access_token) {
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
    // Clean up headers before sending back to client
    responseHeaders.delete("set-cookie"); // Don't forward set-cookie from backend
    responseHeaders.delete("transfer-encoding"); // Avoid issues with chunked encoding
    responseHeaders.delete("connection");

    // Ensure content-type is preserved
    if (response.headers.get("content-type")) {
      responseHeaders.set(
        "content-type",
        response.headers.get("content-type")!
      );
    }

    // Ensure content-length matches actual body length if not chunked
    if (
      responseBody.byteLength > 0 &&
      !responseHeaders.get("transfer-encoding")
    ) {
      responseHeaders.set("content-length", responseBody.byteLength.toString());
    } else if (responseBody.byteLength === 0) {
      responseHeaders.delete("content-length");
    }

    return new NextResponse(responseBody.byteLength > 0 ? responseBody : null, {
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
