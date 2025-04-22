"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

interface UserInfo {
  sub?: string;
  name?: string;
  preferred_username?: string;
  email?: string;
  email_verified?: boolean;
  picture?: string;
}

export default function Home() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUserInfo = async () => {
      setIsLoading(true);
      setError(null);
      const token = localStorage.getItem("accessToken");

      if (!token) {
        setIsLoading(false);
        return; // Not logged in
      }

      const apiUrl =
        process.env.NEXT_PUBLIC_AUTH_API_URL || "http://localhost:8000";

      try {
        const response = await fetch(`${apiUrl}/oauth2/userinfo`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          // Token likely expired
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
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
        }
      } catch (err) {
        console.error("Failed to fetch user info:", err);
        setError(
          err instanceof Error ? err.message : "Could not load user data."
        );
        // Clear potentially invalid token
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        setUserInfo(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserInfo();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUserInfo(null);
    router.refresh();
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
              href="/login"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Login
            </Link>
            <Link
              href="/register"
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
