"use client";

import { redirect } from "next/navigation";
import { Button } from "@/app/ui/product/button";
import Image from "next/image";
import {
  signInSocial,
  useSession,
  signInEmail,
  signUpEmail,
  sendVerificationEmail,
  sendResetPasswordEmail,
} from "@/lib/auth/use-auth-session";
import { useEffect, useState } from "react";

type MessageType = "error" | "success" | null;

interface Message {
  text: string;
  type: MessageType;
}

export default function LoginForm() {
  const { data: session } = useSession();
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
  });

  if (session?.user) {
    // Redirect to the appropriate dashboard based on user's organization
    if (session.user.organization) {
      redirect("/product/admin");
    } else {
      redirect("/product/admin");
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);

    try {
      if (isSignUp) {
        if (formData.password !== formData.confirmPassword) {
          setMessage({ text: "Passwords do not match", type: "error" });
          return;
        }
        const result = await signUpEmail(
          formData.email,
          formData.password,
          formData.name
        );
        if (result.error) {
          setMessage({
            text: result.error.message || "Unknown error.",
            type: "error",
          });
        } else {
          setMessage({
            text: "Success! Check your inbox for verification email.",
            type: "success",
          });
        }
      } else {
        const result = await signInEmail(formData.email, formData.password);
        if (result.error) {
          setMessage({
            text: result.error.message || "Unknown error.",
            type: "error",
          });
        }
      }
    } catch (err) {
      setMessage({
        text: "An unexpected error occurred. Please try again.",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendVerificationEmail = async (e: React.MouseEvent) => {
    e.preventDefault();
    setMessage(null);

    const result = await sendVerificationEmail(formData.email);
    if (result.error) {
      setMessage({
        text: result.error.message || "Unknown error.",
        type: "error",
      });
    } else {
      setMessage({
        text: "Success! Check your inbox for verification email.",
        type: "success",
      });
    }
  };

  const handleResetPassword = async (e: React.MouseEvent) => {
    const result = await sendResetPasswordEmail(formData.email);
    if (result.error) {
      setMessage({
        text: result.error.message || "Unknown error.",
        type: "error",
      });
    } else {
      setMessage({
        text: "Password reset email sent! Check your inbox.",
        type: "success",
      });
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setMessage(null);
    setFormData({
      email: "",
      password: "",
      confirmPassword: "",
      name: "",
    });
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md px-8 py-12 bg-white shadow-md rounded-lg">
        <div className="flex flex-col items-center space-y-6">
          <div className="w-full text-center">
            <h2 className="text-xl font-medium text-gray-900 mb-1">
              {isSignUp ? "Create Account" : "Welcome Back"}
            </h2>
            <p className="text-gray-600 text-sm mb-6">
              {isSignUp
                ? "Create a new account to get started"
                : "Sign in to your account"}
            </p>
          </div>

          {/* Google Sign In */}
          <form
            action={() => {
              signInSocial();
            }}
            className="w-full"
          >
            <Button
              type="submit"
              className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white border border-transparent px-6 py-2.5 rounded-md font-medium text-sm transition-colors"
            >
              <Image
                src="https://authjs.dev/img/providers/google.svg"
                alt="Google logo"
                width={20}
                height={20}
              />
              {isSignUp ? "Sign up with Google" : "Sign in with Google"}
            </Button>
          </form>

          <div className="w-full relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          {/* Email Form */}
          <form onSubmit={handleEmailSubmit} className="w-full space-y-4">
            {message && (
              <div
                className={`p-3 border rounded-md ${
                  message.type === "error"
                    ? "bg-red-50 border-red-200"
                    : "bg-green-50 border-green-200"
                }`}
              >
                <p
                  className={`text-sm ${
                    message.type === "error" ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {message.text}
                </p>
              </div>
            )}

            {isSignUp && (
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Enter your full name"
                  required={isSignUp}
                />
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Enter your email"
                required
              />
            </div>

            {!isSignUp && (
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:text-blue-500 transition-colors"
                  onClick={handleSendVerificationEmail}
                >
                  Send verification email
                </button>
              </div>
            )}

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Enter your password"
                required
              />
            </div>

            {isSignUp && (
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Confirm your password"
                  required={isSignUp}
                />
              </div>
            )}

            {!isSignUp && (
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:text-blue-500 transition-colors"
                  onClick={handleResetPassword}
                >
                  Reset password
                </button>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gray-900 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-md font-medium text-sm transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {isSignUp ? "Creating Account..." : "Signing In..."}
                </div>
              ) : isSignUp ? (
                "Create Account"
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="w-full text-center">
            <p className="text-sm text-gray-600">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}
            </p>
            <button
              onClick={toggleMode}
              className="text-blue-600 hover:text-blue-500 font-medium transition-colors text-sm"
            >
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}