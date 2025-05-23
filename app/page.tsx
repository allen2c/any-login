"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { UserInfo } from "./types/auth";

export default function Home() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get redirect_uri from URL if present
  const redirectUri = searchParams.get("redirect_uri");

  useEffect(() => {
    const fetchUserInfo = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Get access token from localStorage
        const accessToken = localStorage.getItem("accessToken");

        // Prepare headers for the request
        const headers: HeadersInit = {};
        if (accessToken) {
          headers["Authorization"] = `Bearer ${accessToken}`;
        }

        // Call our server-side API route with the access token
        const response = await fetch(`/api/me`, {
          headers,
        });

        if (response.status === 401) {
          // Session likely expired
          setUserInfo(null);
          setError("Session expired. Please log in again.");
        } else if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.detail ||
              `Failed to fetch user info: ${response.statusText}`
          );
        } else {
          const data: UserInfo = await response.json();
          setUserInfo(data);

          // If we have userInfo and redirectUri, redirect back to any-me
          // This would be handled server-side in a real implementation
          if (redirectUri && data) {
            // Construct the redirect URL
            window.location.href = redirectUri;
          }
        }
      } catch (err) {
        console.error("Failed to fetch user info:", err);
        setError(
          err instanceof Error ? err.message : "Could not load user data."
        );
        setUserInfo(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserInfo();
  }, [redirectUri]);

  const handleLogout = async () => {
    try {
      // Clear token from localStorage
      localStorage.removeItem("accessToken");

      // Call our server-side logout API route
      const response = await fetch("/api/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      setUserInfo(null);
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);
      setUserInfo(null);
      router.refresh();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-8">Any-Login SSO</h1>

      {isLoading && <p>Loading...</p>}
      {error && <p className="text-red-500 mb-4">{error}</p>}

      {!isLoading && userInfo && (
        <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg shadow-md text-center max-w-md w-full">
          <h2 className="text-xl font-semibold mb-4">Welcome!</h2>
          {userInfo.picture && (
            <Image
              src={userInfo.picture}
              alt="User profile"
              width={64}
              height={64}
              className="rounded-full mx-auto mb-3"
            />
          )}
          <p className="mb-1">
            <strong>Username:</strong>{" "}
            {userInfo.preferred_username || userInfo.name || "N/A"}
          </p>
          <p className="mb-1">
            <strong>Email:</strong> {userInfo.email || "N/A"}
          </p>
          <p className="mb-4">
            <strong>User ID:</strong> {userInfo.sub || "N/A"}
          </p>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Logout
          </button>
        </div>
      )}

      {!isLoading && !userInfo && (
        <div className="flex flex-col items-center gap-4">
          <p className="mb-4">You are not logged in.</p>
          <div className="flex gap-4">
            <Link
              href={
                redirectUri
                  ? `/login?redirect_uri=${encodeURIComponent(redirectUri)}`
                  : "/login"
              }
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Login
            </Link>
            <Link
              href={
                redirectUri
                  ? `/register?redirect_uri=${encodeURIComponent(redirectUri)}`
                  : "/register"
              }
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Register
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
