"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function Callback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");
    const token = searchParams.get("token");

    if (error) {
      console.error("Auth error:", error, errorDescription);
      router.push(`/?error=${encodeURIComponent(errorDescription || error)}`);
    } else if (token) {
      // Store the token received from any-login
      console.log("Authentication successful, received token");
      localStorage.setItem("accessToken", token);
      router.push("/");
    } else {
      console.warn("No token received in callback");
      router.push("/");
    }
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Processing login, please wait...</p>
    </div>
  );
}
