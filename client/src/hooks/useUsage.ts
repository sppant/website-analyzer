import { useCallback, useEffect } from "react";

import { useAuth } from "../auth/AuthContext";
import { useUsageStore } from "./usageStore";

/**
 * Reads the authenticated user's monthly analysis usage from the shared
 * `useUsageStore`. Returns `null` for anonymous visitors. Call `refresh()`
 * after a successful analysis.
 */
export function useUsage() {
  const { status } = useAuth();
  const usage = useUsageStore((state) => state.usage);
  const isLoading = useUsageStore((state) => state.isLoading);

  const refresh = useCallback(async () => {
    if (status !== "authenticated") {
      useUsageStore.getState().clear();
      return;
    }
    await useUsageStore.getState().fetch();
  }, [status]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { usage, isLoading, refresh };
}
