"use client";

/**
 * ConnectionStatusBanner — offline/reconnecting banner
 *
 * Shows a sticky banner when the WebSocket is disconnected.
 * Disappears when connection is restored.
 *
 * Usage:
 *   <ConnectionStatusBanner />  ← place once in the authenticated layout
 */

import { useConnectionStatus } from "@/lib/realtime/hooks/use-connection-status";
import { cn } from "@/components/ui/cn";

export function ConnectionStatusBanner() {
  const { connected, reconnecting } = useConnectionStatus();

  if (connected) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-50",
        "flex items-center gap-2 px-4 py-2 rounded-full shadow-lg",
        "text-sm font-medium text-white",
        reconnecting ? "bg-yellow-600" : "bg-red-600",
      )}
      role="status"
      aria-live="polite"
    >
      {reconnecting ? (
        <>
          <svg
            className="w-3.5 h-3.5 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          Reconnexion en cours…
        </>
      ) : (
        <>
          <span className="w-2 h-2 rounded-full bg-white/80 animate-pulse" />
          Hors ligne — vérifiez votre connexion
        </>
      )}
    </div>
  );
}
