import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    // Get the googleAccessToken from cookie
    const googleAccessToken = req.cookies.get("googleAccessToken")?.value;

    if (!googleAccessToken) {
      return NextResponse.json(
        { error: "Google access token not found" },
        { status: 401 }
      );
    }

    // Return the token in JSON
    return NextResponse.json({ googleToken: googleAccessToken });
  } catch (error) {
    console.error("[Google OAuth] Error fetching token:", error);
    return NextResponse.json(
      { error: "Failed to get Google token" },
      { status: 500 }
    );
  }
}
