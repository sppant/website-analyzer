"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

type Status = "loading" | "authenticated" | "anonymous";

type MeResponse = { user: { id: string; email: string } };

/**
 * Small, read-only mirror of the SPA's `AuthContext` — just enough to render
 * the right nav state (Log in/Sign up vs. the user's email + a logout
 * button). It does not own the session; it only reads it, via the same
 * `/api/auth/me` endpoint the SPA calls, sharing the same host-only cookie.
 *
 * Login/signup/dashboard themselves stay in the SPA — this app doesn't
 * duplicate that logic, only enough to avoid showing a stale nav for
 * visitors who arrive on a marketing/blog page while already signed in.
 */
function AuthStatus() {
  const [status, setStatus] = useState<Status>("loading");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_URL}/api/auth/me`, { credentials: "include" })
      .then((res) => (res.ok ? (res.json() as Promise<MeResponse>) : null))
      .then((data) => {
        if (cancelled) return;
        if (data) {
          setEmail(data.user.email);
          setStatus("authenticated");
        } else {
          setStatus("anonymous");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("anonymous");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogout() {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    window.location.href = "/";
  }

  if (status === "loading") return null;

  if (status === "authenticated") {
    return (
      <>
        <a href="/app/dashboard" className="nav-user" title={email ?? undefined}>
          {email}
        </a>
        <button type="button" className="nav-link-button" onClick={handleLogout}>
          Log out
        </button>
      </>
    );
  }

  return (
    <>
      <a href="/app/login">Log in</a>
      <a href="/app/signup" className="nav-cta">
        Sign up
      </a>
    </>
  );
}

export default AuthStatus;
