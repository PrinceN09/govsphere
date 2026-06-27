"use client";

/**
 * useConnectionStatus — tracks WebSocket connection state
 *
 * Usage:
 *   const { connected, reconnecting } = useConnectionStatus();
 */

import { useState, useEffect } from "react";
import { useRealtimeContext } from "../realtime-context";

export type ConnectionStatus = "connected" | "disconnected" | "reconnecting";

export function useConnectionStatus() {
  const { client } = useRealtimeContext();
  const [status, setStatus] = useState<ConnectionStatus>(
    client?.connected ? "connected" : "disconnected",
  );

  useEffect(() => {
    if (!client) return;

    const onConnect = () => setStatus("connected");
    const onDisconnect = () => setStatus("disconnected");
    const onReconnectAttempt = () => setStatus("reconnecting");

    client.on("connect", onConnect);
    client.on("disconnect", onDisconnect);

    // Socket.IO reconnect events come from the underlying manager
    // We approximate with the disconnect → reconnecting transition
    const socket = (client as unknown as { socket: { io: { on: (e: string, cb: () => void) => void; off: (e: string, cb: () => void) => void } } }).socket;
    socket?.io?.on("reconnect_attempt", onReconnectAttempt);
    socket?.io?.on("reconnect", onConnect);

    return () => {
      client.off("connect", onConnect);
      client.off("disconnect", onDisconnect);
      socket?.io?.off("reconnect_attempt", onReconnectAttempt);
      socket?.io?.off("reconnect", onConnect);
    };
  }, [client]);

  return {
    connected:    status === "connected",
    disconnected: status === "disconnected",
    reconnecting: status === "reconnecting",
    status,
  };
}
