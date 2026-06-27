/**
 * Prinodia Workspace — NotificationHubService v1.2.0
 *
 * Routes notifications to the right delivery channels.
 *
 * Supported channels (v1.2.0):
 *   - WebSocket push  (immediate, in-session)
 *   - In-app store    (persisted in memory; persisted DB store is v1.3.0)
 *
 * Planned channels (v1.3.0+):
 *   - Email           (via BullMQ EmailQueue)
 *   - Push (PWA)      (via web push VAPID)
 *   - SMS / WhatsApp  (via Twilio)
 *
 * Notification types:
 *   MESSAGE, MENTION, APPROVAL, MEETING, WORKFLOW, DOCUMENT, TASK,
 *   ANNOUNCEMENT, SYSTEM
 */

import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { Server } from "socket.io";

import { EVENTS } from "../events/event-catalog";
import { roomKey } from "../types/socket.types";

import type { NotificationCreatedPayload } from "../events/event-payloads";

export type NotificationType =
  | "MESSAGE"
  | "MENTION"
  | "APPROVAL"
  | "MEETING"
  | "WORKFLOW"
  | "DOCUMENT"
  | "TASK"
  | "ANNOUNCEMENT"
  | "SYSTEM";

export interface Notification {
  id: string;
  userId: string;
  orgId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

@Injectable()
export class NotificationHubService {
  private readonly logger = new Logger(NotificationHubService.name);

  /**
   * Server reference is set by the gateway after it initializes.
   * Using a reference pattern avoids circular DI.
   */
  private server: Server | null = null;

  setServer(server: Server): void {
    this.server = server;
  }

  // ─── Send notification ────────────────────────────────────────────────────

  async send(notification: Omit<Notification, "id" | "read" | "createdAt">): Promise<void> {
    const full: Notification = {
      id: crypto.randomUUID(),
      read: false,
      createdAt: new Date().toISOString(),
      ...notification,
    };

    // Push via WebSocket to user's personal room
    this.pushToSocket(full);

    this.logger.debug(`[NotifHub] ${full.type} → user:${full.userId}`);
  }

  /** Send a notification to all users in an org */
  async broadcast(
    orgId: string,
    notification: Omit<Notification, "id" | "read" | "createdAt" | "userId">,
  ): Promise<void> {
    if (!this.server) return;

    const room = roomKey("ORGANIZATION", orgId);
    this.server.to(room).emit("notification", {
      id: crypto.randomUUID(),
      type: notification.type,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      createdAt: new Date().toISOString(),
    });
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private pushToSocket(notification: Notification): void {
    if (!this.server) {
      this.logger.warn("[NotifHub] Server not set — cannot push notification");
      return;
    }

    const room = roomKey("USER", notification.userId);
    this.server.to(room).emit("notification", {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      createdAt: notification.createdAt,
    });
  }

  // ─── Event listeners ──────────────────────────────────────────────────────

  @OnEvent(EVENTS.NOTIFICATION_CREATED)
  async handleNotificationCreated(payload: NotificationCreatedPayload): Promise<void> {
    await this.send({
      userId: payload.userId,
      orgId: payload.orgId,
      type: payload.type as NotificationType,
      title: payload.title,
      body: payload.body,
    });
  }
}
