"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

/**
 * Wraps the entire app and shows a login/signup form
 * when no session is active.
 *
 * In demo mode (when Supabase env vars are placeholders) it
 * falls through and renders children immediately.
 */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, signIn, signUp, signOut } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // If Supabase isn't configured, skip auth (demo mode)
  const isDemoMode =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

  if (isDemoMode) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-950 text-neutral-500">
        Loading&hellip;
      </div>
    );
  }

  if (user) {
    return (
      <>
        {/* Inject a sign-out button at the top */}
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={signOut}
            className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
          >
            Sign out ({user.email})
          </button>
        </div>
        {children}
      </>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const err =
      mode === "login"
        ? await signIn(email, password)
        : await signUp(email, password, fullName);

    if (err) setError(err.message);
    setSubmitting(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-950">
      <div className="w-full max-w-sm p-8 rounded-2xl border border-neutral-800 bg-neutral-900/50">
        <h1 className="text-2xl font-bold text-center mb-1">Meeting Agent</h1>
        <p className="text-sm text-neutral-500 text-center mb-6">
          {mode === "login" ? "Sign in to continue" : "Create an account"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <input
              type="text"
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-neutral-800 border border-neutral-700 text-sm placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2.5 rounded-lg bg-neutral-800 border border-neutral-700 text-sm placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-2.5 rounded-lg bg-neutral-800 border border-neutral-700 text-sm placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />

          {error && (
            <p className="text-xs text-red-400 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
          >
            {submitting
              ? "Please wait…"
              : mode === "login"
              ? "Sign In"
              : "Sign Up"}
          </button>
        </form>

        <p className="text-xs text-neutral-500 text-center mt-4">
          {mode === "login" ? (
            <>
              Don&apos;t have an account?{" "}
              <button
                onClick={() => {
                  setMode("signup");
                  setError(null);
                }}
                className="text-blue-400 hover:underline cursor-pointer"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
                className="text-blue-400 hover:underline cursor-pointer"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
