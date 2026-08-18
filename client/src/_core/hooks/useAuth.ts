import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = "/login" } = options ?? {};
  const utils = trpc.useUtils();
  const sessionQuery = trpc.logistics.session.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const logoutMutation = trpc.logistics.logout.useMutation({
    onSuccess: async () => {
      await utils.logistics.session.invalidate();
    },
  });

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (error instanceof TRPCClientError && error.data?.code === "UNAUTHORIZED") return;
      throw error;
    } finally {
      await utils.logistics.session.invalidate();
    }
  }, [logoutMutation, utils]);

  const state = useMemo(
    () => ({
      user: sessionQuery.data ?? null,
      loading: sessionQuery.isLoading || logoutMutation.isPending,
      error: sessionQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(sessionQuery.data),
    }),
    [
      logoutMutation.error,
      logoutMutation.isPending,
      sessionQuery.data,
      sessionQuery.error,
      sessionQuery.isLoading,
    ],
  );

  useEffect(() => {
    if (!redirectOnUnauthenticated || state.loading || state.user || typeof window === "undefined") return;
    if (window.location.pathname !== redirectPath) window.location.href = redirectPath;
  }, [redirectOnUnauthenticated, redirectPath, state.loading, state.user]);

  return { ...state, refresh: () => sessionQuery.refetch(), logout };
}
