"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function GoogleLoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();

  const email = searchParams.get("email");
  const googleId = searchParams.get("id");

  useEffect(() => {
    if (!email || !googleId) {
      setError("Missing required parameters");
      setIsLoading(false);
      return;
    }

    const completeLogin = async () => {
      try {
        // Get Google token from sessionStorage, if it was saved during the auth flow
        const googleToken = sessionStorage.getItem("googleAccessToken");
        if (!googleToken) {
          setError(
            "Google authentication token missing. Please try signing in again."
          );
          setIsLoading(false);
          return;
        }

        // Call special endpoint for Google login
        const response = await fetch("/api/auth/google/complete-login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            googleId,
            googleToken,
          }),
        });

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Login failed" }));
          throw new Error(errorData.error || "Login failed");
        }

        // Success - redirect to home
        router.push("/");
      } catch (error) {
        setError(
          `Authentication failed: ${
            error instanceof Error ? error.message : "Please try regular login"
          }`
        );
        setIsLoading(false);
      }
    };

    completeLogin();
  }, [email, googleId, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Google Sign In</h1>

        {isLoading ? (
          <div className="text-center">
            <p className="mb-4">Completing your Google sign in...</p>
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        ) : error ? (
          <div className="text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <div className="flex flex-col gap-3 mt-6">
              <button
                onClick={() => router.push("/login")}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Go to Login
              </button>
              <button
                onClick={() => router.push("/register")}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              >
                Register
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
