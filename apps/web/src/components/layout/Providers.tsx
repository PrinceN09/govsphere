"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { Session } from "next-auth";
import { setAccessToken } from "@/lib/api";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

/** Syncs the NextAuth access token into the axios client on every session change. */
function TokenSync() {
  const { data: session } = useSession();
  useEffect(() => {
    setAccessToken(session?.accessToken ?? null);
  }, [session?.accessToken]);
  return null;
}

interface ProvidersProps {
  children: React.ReactNode;
  session: Session | null;
}

export function Providers({ children, session }: ProvidersProps) {
  return (
    <SessionProvider session={session}>
      <QueryClientProvider client={queryClient}>
        <TokenSync />
        {children}
      </QueryClientProvider>
    </SessionProvider>
  );
}
