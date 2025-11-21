"use client";

import { createAuthClient } from "better-auth/react";
import { customSessionClient } from "better-auth/client/plugins";
import { ExtendedSessionUser } from "./types";

const authClient = createAuthClient({
  plugins: [customSessionClient()],
});

// Now you can use it in your components with full type safety
export function useSession() {
  const { useSession: _useSession, updateUser } = authClient;
  const { data, isPending, error, refetch } = _useSession();

  const session = data as { user: ExtendedSessionUser } | null;

  return {
    data: session,
    update: updateUser,
    isPending,
    error,
    refetch,
  };
}

export async function signUpEmail(
  email: string,
  password: string,
  name: string
) {
  return await authClient.signUp.email({
    callbackURL: "/product/admin",
    email,
    password,
    name,
  });
}

export async function signInSocial() {
  return await authClient.signIn.social({
    provider: "google",
    callbackURL: "/product/admin",
  });
}

export async function signInEmail(email: string, password: string) {
  return await authClient.signIn.email({
    callbackURL: "/product/admin",
    email,
    password,
  });
}

export async function sendVerificationEmail(email: string) {
  if (email.length === 0) {
    return { error: { message: "Email is required" } };
  }
  return await authClient.sendVerificationEmail({
    email,
    callbackURL: "/product/admin",
  });
}

export async function sendResetPasswordEmail(email: string) {
  if (email.length === 0) {
    return { error: { message: "Email is required" } };
  }
  return await authClient.requestPasswordReset({
    email,
    redirectTo: "/password-reset",
  });
}

export async function resetPassword(newPassword: string, token: string) {
  return await authClient.resetPassword({
    newPassword,
    token,
  });
}

export async function signOut(redirectUrl?: string) {
  await authClient.signOut();
  window.location.href = redirectUrl || "/login";
}
