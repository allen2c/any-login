import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Get the access token from the httpOnly cookie
  const accessToken = req.cookies.get("accessToken")?.value;

  if (!accessToken) {
    return NextResponse.json(
      { error: "No access token found" },
      { status: 401 }
    );
  }

  // Return the token to the client
  return NextResponse.json({ token: accessToken });
}
