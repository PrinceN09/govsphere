/**
 * @prinodia/realtime — Public API
 *
 * The real-time client SDK for Prinodia Workspace.
 *
 * @example
 * import { RealtimeClient } from "@prinodia/realtime";
 *
 * const client = new RealtimeClient({ url: "https://api.prinodia.gov.cd", token });
 * client.connect();
 * client.presence((e) => console.log(e.userId, "→", e.status));
 * client.notifications((n) => showToast(n.title, n.body));
 * await client.joinRoom("CHANNEL", channelId);
 * client.startTyping(channelId);
 */

export { RealtimeClient } from "./client";
export type {
  RealtimeClientOptions,
  RealtimeEventMap,
  PresenceStatus,
  DeviceType,
  RoomType,
  PresenceUpdateEvent,
  NotificationEvent,
  ActivityEvent,
  RoomUserJoinedEvent,
  RoomUserLeftEvent,
  TypingEvent,
} from "./types";
