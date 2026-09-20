import { create } from "zustand";

import { apiFetch } from "../lib/api";
import type { Plan, PublicSubscription } from "../types/plan";

export type AuthUser = {
  id: string;
  email: string;
};

export type AuthStatus = "loading" | "authenticated" | "anonymous";

type MeResponse = {
  user: AuthUser;
  plan: Plan;
  subscription: PublicSubscription | null;
};

type AuthState = {
  user: AuthUser | null;
  /** The server-authoritative effective plan. `null` while loading / anonymous. */
  plan: Plan | null;
  /** Safe subscription view (status, cancel-at-period-end). `null` if never subscribed. */
  subscription: PublicSubscription | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Re-fetch `/api/auth/me` (e.g. after returning from Stripe Checkout). */
  refresh: () => Promise<void>;
};

/**
 * Global session store. This is genuinely cross-cutting state — read by the
 * nav, both auth forms, and half a dozen unrelated pages — which is exactly
 * the case Zustand is for: a plain external store beats threading a Context
 * through the tree, and consumers that only need one field (e.g. `status`)
 * can select just that instead of re-rendering on every session change.
 *
 * No Provider is needed; `AuthProvider` in `AuthContext.tsx` only kicks off
 * the initial `refresh()` once when the app mounts.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  plan: null,
  subscription: null,
  status: "loading",

  refresh: async () => {
    try {
      const data = await apiFetch<MeResponse>("/api/auth/me");
      set({
        user: data.user,
        plan: data.plan,
        subscription: data.subscription ?? null,
        status: "authenticated",
      });
    } catch {
      set({ user: null, plan: null, subscription: null, status: "anonymous" });
    }
  },

  login: async (email, password) => {
    const data = await apiFetch<MeResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    set({
      user: data.user,
      plan: data.plan,
      subscription: data.subscription ?? null,
      status: "authenticated",
    });
  },

  signup: async (email, password) => {
    const data = await apiFetch<MeResponse>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    set({
      user: data.user,
      plan: data.plan,
      subscription: data.subscription ?? null,
      status: "authenticated",
    });
  },

  logout: async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } finally {
      set({ user: null, plan: null, subscription: null, status: "anonymous" });
    }
  },
}));
