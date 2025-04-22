"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserCreateRequest, UserRegistrationResponse } from "../types/auth";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    try {
      // Create request body using our type definition
      const requestBody: UserCreateRequest = {
        username,
        email,
        password,
      };

      const response = await fetch(`/api/auth/v1/users/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Registration error response:", errorText);
        let errorData;
        let errorMessage = `Registration failed: ${response.statusText}`; // Default message
        try {
          errorData = JSON.parse(errorText);
          // Enhanced error handling for validation errors
          if (errorData.detail) {
            if (Array.isArray(errorData.detail)) {
              // Format array of validation errors
              errorMessage = errorData.detail
                .map(
                  (err: { loc?: string[]; msg: string }) =>
                    `${err.loc?.slice(-1)[0] || "Error"}: ${err.msg}`
                )
                .join("; ");
            } else if (typeof errorData.detail === "string") {
              // Handle if detail is just a string
              errorMessage = errorData.detail;
            }
          }
        } catch {
          // If parsing fails, use the raw text or default status text
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Parse response with our typed interface
      const data: UserRegistrationResponse = await response.json();
      console.log("Registration successful:", data);

      // Registration successful, redirect to login
      router.push("/login");
    } catch (err) {
      console.error("Registration error:", err);
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <h1 className="text-2xl font-bold mb-6">Register</h1>
      <form onSubmit={handleSubmit} className="w-full max-w-xs">
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <div className="mb-4">
          <label
            className="block text-gray-700 text-sm font-bold mb-2"
            htmlFor="username"
          >
            Username
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="username"
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="mb-4">
          <label
            className="block text-gray-700 text-sm font-bold mb-2"
            htmlFor="email"
          >
            Email
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="mb-6">
          <label
            className="block text-gray-700 text-sm font-bold mb-2"
            htmlFor="password"
          >
            Password
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
            id="password"
            type="password"
            placeholder="******************"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="flex items-center justify-between">
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            type="submit"
          >
            Register
          </button>
          <Link
            href="/login"
            className="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800"
          >
            Already have an account?
          </Link>
        </div>
      </form>
    </div>
  );
}
