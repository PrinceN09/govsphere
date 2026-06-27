"use client";

/**
 * Prinodia Workspace Web — RealtimeContext v1.2.0
 *
 * Provides the RealtimeClient instance to all descendant components.
 * Mount this once at the root authenticated layout.
 *
 * Usage:
 *   // In apps/web/src/app/(admin)/layout.tsx:
 *   <RealtimeProvider token={session.accessToken}>
 *     {children}
 *   </RealtimeProvider>
 */

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";

import { RealtimeClient } from "@prinodia/realtime";
import { getRealtimeClient, destroyRealtimeClient } from "./realtime-client";

interface RealtimeContextValue {
  client: RealtimeClient | null;
  connected: boolean;
}

const RealtimeContext = createContext<RealtimeContextValue>({
  client:    null,
  connected: false,
});

interface RealtimeProviderProps {
  token: string;
  children: ReactNode;
}

export function RealtimeProvider({ token, children }: RealtimeProviderProps) {
  const clientRef = useRef<RealtimeClient | null>(null);

  useEffect(() => {
    const client = getRealtimeClient(token);
    clientRef.current = client;
    client.connect();

    return () => {
      destroyRealtimeClient();
      clientRef.current = null;
    };
  }, [token]);

  return (
    <RealtimeContext.Provider value={{ client: clientRef.current, connected: clientRef.current?.connected ?? false }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtimeContext(): RealtimeContextValue {
  return useContext(RealtimeContext);
}
