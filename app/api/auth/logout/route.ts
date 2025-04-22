import { NextResponse } from "next/server";

export async function POST() {
  // Create a response with cookies cleared
  const response = NextResponse.json(
    { message: "Logged out successfully" },
    { status: 200 }
  );

  // Clear the authentication cookies
  response.cookies.delete("accessToken");
  response.cookies.delete("refreshToken");

  return response;
}
