/**
 * Prinodia Workspace Web — RealtimeClient singleton
 *
 * Creates and caches the SDK client, using the NextAuth session token.
 * This module is imported by the RealtimeProvider and any hook that needs
 * direct socket access.
 */

import { RealtimeClient } from "@prinodia/realtime";

let _client: RealtimeClient | null = null;

export function getRealtimeClient(token: string): RealtimeClient {
  const wsUrl = process.env["NEXT_PUBLIC_WS_URL"] ?? "http://localhost:4000";

  if (!_client) {
    _client = new RealtimeClient({ url: wsUrl, token });
  }
  return _client;
}

export function destroyRealtimeClient(): void {
  _client?.disconnect();
  _client = null;
}
