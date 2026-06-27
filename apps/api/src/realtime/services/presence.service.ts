/**
 * Prinodia Workspace — RealtimePresenceService v1.2.0
 *
 * Redis-backed presence with IN_MEETING / ON_CALL auto-status via EventBus.
 *
 * Key schema: presence:{userId} → JSON:PresenceRecord  TTL: 10 min
 *
 * Note: PresenceStatus is a local string union (not @prisma/client) because
 * the Prisma sandbox blocks generation of the new enum values in v1.2.0.
 */

import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { RedisService } from "../../infrastructure/redis/redis.service";
import { EventBusService } from "../events/event-bus.service";
import { EVENTS } from "../events/event-catalog";

import type {
  ClientConnectedPayload,
  ClientDisconnectedPayload,
  MeetingStartedPayload,
  MeetingEndedPayload,
} from "../events/event-payloads";

// Local string-literal type (Prisma sandbox — v1.2.0 enum not yet generated)
export type PresenceStatus =
  | "ONLINE"
  | "AWAY"
  | "BUSY"
  | "DO_NOT_DISTURB"
  | "IN_MEETING"
  | "ON_CALL"
  | "OFFLINE";

export interface PresenceRecord {
  userId: string;
  orgId: string;
  status: PresenceStatus;
  statusMessage: string | undefined;
  previousStatus: PresenceStatus | undefined;
  updatedAt: string;
}

const TTL = 10 * 60;
const KEY = (uid: string) => `presence:${uid}`;

@Injectable()
export class RealtimePresenceService {
  private readonly logger = new Logger(RealtimePresenceService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly eventBus: EventBusService,
  ) {}

  async setStatus(
    userId: string,
    orgId: string,
    status: PresenceStatus,
    statusMessage?: string,
  ): Promise<PresenceRecord> {
    const current = await this.getRecord(userId);
    const record: PresenceRecord = {
      userId,
      orgId,
      status,
      statusMessage: statusMessage,
      previousStatus: current?.status,
      updatedAt: new Date().toISOString(),
    };

    await this.redis.set(KEY(userId), JSON.stringify(record), TTL);

    // Emit — spread only defined optional fields to satisfy exactOptionalPropertyTypes
    this.eventBus.emit(EVENTS.PRESENCE_UPDATED, {
      userId,
      orgId,
      status,
      ...(statusMessage !== undefined ? { statusMessage } : {}),
      ...(current?.status !== undefined ? { previousStatus: current.status } : {}),
    });

    this.logger.debug(`[Presence] ${userId} → ${status}`);
    return record;
  }

  async getRecord(userId: string): Promise<PresenceRecord | null> {
    const raw = await this.redis.get(KEY(userId));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PresenceRecord;
    } catch {
      return null;
    }
  }

  async getStatus(userId: string): Promise<PresenceRecord> {
    return (
      (await this.getRecord(userId)) ?? {
        userId,
        orgId: "",
        status: "OFFLINE",
        statusMessage: undefined,
        previousStatus: undefined,
        updatedAt: new Date().toISOString(),
      }
    );
  }

  async getBulkStatus(userIds: string[]): Promise<PresenceRecord[]> {
    if (!userIds.length) return [];
    const raws = await this.redis.mGet(userIds.map(KEY));
    return userIds.map((id, i) => {
      const raw = raws[i];
      if (!raw) {
        return {
          userId: id,
          orgId: "",
          status: "OFFLINE" as const,
          statusMessage: undefined,
          previousStatus: undefined,
          updatedAt: new Date().toISOString(),
        };
      }
      try {
        return JSON.parse(raw) as PresenceRecord;
      } catch {
        return {
          userId: id,
          orgId: "",
          status: "OFFLINE" as const,
          statusMessage: undefined,
          previousStatus: undefined,
          updatedAt: new Date().toISOString(),
        };
      }
    });
  }

  async heartbeat(userId: string, orgId: string): Promise<void> {
    const record = await this.getRecord(userId);
    if (!record) {
      await this.setStatus(userId, orgId, "ONLINE");
      return;
    }
    if (record.status === "AWAY") {
      await this.setStatus(userId, orgId, "ONLINE");
    } else {
      await this.redis.expire(KEY(userId), TTL);
    }
  }

  async clearPresence(userId: string, orgId: string): Promise<void> {
    await this.redis.del(KEY(userId));
    this.eventBus.emit(EVENTS.USER_OFFLINE, { userId, orgId, status: "OFFLINE" });
  }

  @OnEvent(EVENTS.CLIENT_CONNECTED)
  async handleClientConnected(payload: ClientConnectedPayload): Promise<void> {
    const existing = await this.getRecord(payload.userId);
    const specialStatuses: PresenceStatus[] = ["IN_MEETING", "ON_CALL", "BUSY", "DO_NOT_DISTURB"];
    if (!existing || !specialStatuses.includes(existing.status)) {
      await this.setStatus(payload.userId, payload.orgId, "ONLINE");
    }
  }

  @OnEvent(EVENTS.CLIENT_DISCONNECTED)
  handleClientDisconnected(payload: ClientDisconnectedPayload): void {
    this.logger.debug(`[Presence] ${payload.userId} disconnected (${payload.reason})`);
  }

  @OnEvent(EVENTS.MEETING_STARTED)
  async handleMeetingStarted(payload: MeetingStartedPayload): Promise<void> {
    const record = await this.getRecord(payload.organizerId);
    if (record) {
      await this.setStatus(payload.organizerId, record.orgId, "IN_MEETING");
    }
  }

  @OnEvent(EVENTS.MEETING_ENDED)
  async handleMeetingEnded(payload: MeetingEndedPayload & { organizerId: string }): Promise<void> {
    const record = await this.getRecord(payload.organizerId);
    if (record?.status === "IN_MEETING") {
      await this.setStatus(payload.organizerId, record.orgId, "ONLINE");
    }
  }
}
