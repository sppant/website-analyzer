import { useEffect } from "react";
import type { ReactNode } from "react";

import { useAuthStore } from "./authStore";

export type { AuthUser, AuthStatus } from "./authStore";

/** Kicks off the initial `/api/auth/me` fetch once when the app mounts. */
export function AuthProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    void useAuthStore.getState().refresh();
  }, []);

  return <>{children}</>;
}

/**
 * Session state + actions, backed by the Zustand store in `authStore.ts`.
 * Kept as a hook (rather than importing `useAuthStore` directly everywhere)
 * so call sites don't need to know or care that it's a store.
 */
export const useAuth = useAuthStore;
