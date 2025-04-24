"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function Callback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (error) {
      console.error("Auth error:", error, errorDescription);
      router.push(`/?error=${encodeURIComponent(errorDescription || error)}`);
    } else {
      // Successfully logged in through any-login
      // No need to extract token from URL - cookies will be sent automatically
      console.log("Authentication successful, redirecting to home");
      router.push("/");
    }
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Processing login, please wait...</p>
    </div>
  );
}
