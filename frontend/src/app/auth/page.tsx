"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export default function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const backendBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000",
    [],
  );

  async function handleGoogleLogin() {
    try {
      setLoading(true);
      setError(null);

      const redirectUri = `${backendBaseUrl}/api/v1/auth/google/callback`;
      const res = await fetch(
        `${backendBaseUrl}/api/v1/auth/google/login?redirect_uri=${encodeURIComponent(redirectUri)}`,
        { credentials: "include" },
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Unable to start Google OAuth");
      }

      const data = (await res.json()) as { auth_url?: string };
      if (!data.auth_url) {
        throw new Error("OAuth URL missing in backend response");
      }

      window.location.href = data.auth_url;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100 sm:px-10">
      <main className="mx-auto w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
        <h1 className="text-2xl font-semibold">Auth Test</h1>
        <p className="mt-3 text-sm text-slate-300">
          This page triggers your backend Google OAuth endpoint and redirects to Google consent.
        </p>

        <div className="mt-6 rounded-lg border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
          <p>Backend URL: {backendBaseUrl}</p>
          <p>Route: /api/v1/auth/google/login</p>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Redirecting..." : "Continue with Google"}
        </button>

        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}

        <Link href="/" className="mt-6 inline-block text-sm text-cyan-300 hover:text-cyan-200">
          Back to Home
        </Link>
      </main>
    </div>
  );
}
