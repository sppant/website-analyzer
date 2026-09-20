import { create } from "zustand";

import { apiFetch } from "../lib/api";
import type { Usage } from "../types/analyses";

type UsageState = {
  usage: Usage | null;
  isLoading: boolean;
  fetch: () => Promise<void>;
  clear: () => void;
};

/**
 * The user's monthly analysis quota is a single account-level fact, not
 * page-scoped data — `AnalyzerPage` and `DashboardPage` both display it, and
 * without a shared store each held its own copy (two independent fetches,
 * and updating one didn't update the other). A Zustand store makes it one
 * cache both read and write through `useUsage()` below.
 */
export const useUsageStore = create<UsageState>((set) => ({
  usage: null,
  isLoading: false,

  fetch: async () => {
    set({ isLoading: true });
    try {
      set({ usage: await apiFetch<Usage>("/api/usage") });
    } catch {
      set({ usage: null });
    } finally {
      set({ isLoading: false });
    }
  },

  clear: () => set({ usage: null, isLoading: false }),
}));
