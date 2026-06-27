/**
 * Prinodia Workspace — ActivityService v1.2.0
 *
 * Persists and streams org-scoped activity events.
 *
 * Every domain event that should appear in the activity feed is handled here
 * via @OnEvent listeners. The service:
 *   1. Writes the event to the `activity_events` table (durable)
 *   2. Re-emits via EventBus so the gateway can push to org:* room
 *
 * Retention: default 90-day rolling window (cleaned by sweepOld).
 */

import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { PrismaService } from "../../prisma/prisma.service";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPrisma = any;
import { EVENTS } from "../events/event-catalog";

import type {
  ActivityEventPayload,
  WorkflowSubmittedPayload,
  WorkflowApprovedPayload,
  DocumentCreatedPayload,
  MeetingCreatedPayload,
} from "../events/event-payloads";

export interface ActivityRecord {
  id: string;
  orgId: string;
  actorId: string;
  actorName: string;
  eventType: string;
  resourceType: string;
  resourceId: string;
  summary: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Write ────────────────────────────────────────────────────────────────

  async record(
    orgId: string,
    actorId: string,
    eventType: string,
    resourceType: string,
    resourceId: string,
    summary: string,
    metadata: Record<string, unknown> = {},
  ): Promise<ActivityRecord> {
    const event = (await (this.prisma as AnyPrisma).activityEvent.create({
      data: { orgId, actorId, eventType, resourceType, resourceId, summary, metadata },
    })) as ActivityRecord;

    this.logger.debug(`[Activity] ${eventType} by ${actorId} in ${orgId}`);
    return event;
  }

  // ─── Query ────────────────────────────────────────────────────────────────

  async listForOrg(
    orgId: string,
    options: { limit?: number; before?: string } = {},
  ): Promise<ActivityRecord[]> {
    const { limit = 50, before } = options;
    const cursor = before ? { createdAt: { lt: new Date(before) } } : {};

    return (this.prisma as AnyPrisma).activityEvent.findMany({
      where: { orgId, ...cursor },
      orderBy: { createdAt: "desc" },
      take: limit,
    }) as Promise<ActivityRecord[]>;
  }

  async listForActor(actorId: string, options: { limit?: number } = {}): Promise<ActivityRecord[]> {
    return (this.prisma as AnyPrisma).activityEvent.findMany({
      where: { actorId },
      orderBy: { createdAt: "desc" },
      take: options.limit ?? 50,
    }) as Promise<ActivityRecord[]>;
  }

  /** Sweep activity events older than retentionDays (default 90). */
  async sweepOld(retentionDays = 90): Promise<number> {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const result = (await (this.prisma as AnyPrisma).activityEvent.deleteMany({
      where: { createdAt: { lt: cutoff } },
    })) as { count: number };
    if (result.count > 0) {
      this.logger.log(`[Activity] swept ${result.count} old events`);
    }
    return result.count;
  }

  // ─── Event listeners — record domain events into activity feed ────────────

  @OnEvent(EVENTS.ACTIVITY_EVENT)
  async handleActivityEvent(payload: ActivityEventPayload): Promise<void> {
    await this.record(
      payload.orgId,
      payload.actorId,
      payload.eventType,
      payload.resourceType,
      payload.resourceId,
      payload.summary,
      payload.metadata,
    ).catch((err: unknown) => {
      this.logger.error("Failed to record activity event:", err);
    });
  }

  @OnEvent(EVENTS.WORKFLOW_SUBMITTED)
  async handleWorkflowSubmitted(payload: WorkflowSubmittedPayload): Promise<void> {
    await this.record(
      payload.orgId,
      payload.submitterId,
      "workflow.submitted",
      "workflow",
      payload.instanceId,
      `submitted workflow "${payload.title}"`,
    ).catch(() => void 0);
  }

  @OnEvent(EVENTS.WORKFLOW_APPROVED)
  async handleWorkflowApproved(payload: WorkflowApprovedPayload): Promise<void> {
    await this.record(
      payload.orgId,
      payload.approverId,
      "workflow.approved",
      "workflow",
      payload.instanceId,
      "approved a workflow",
    ).catch(() => void 0);
  }

  @OnEvent(EVENTS.DOCUMENT_CREATED)
  async handleDocumentCreated(payload: DocumentCreatedPayload): Promise<void> {
    await this.record(
      payload.orgId,
      payload.authorId,
      "document.created",
      "document",
      payload.documentId,
      `created document "${payload.title}"`,
    ).catch(() => void 0);
  }

  @OnEvent(EVENTS.MEETING_CREATED)
  async handleMeetingCreated(payload: MeetingCreatedPayload): Promise<void> {
    await this.record(
      payload.orgId,
      payload.organizerId,
      "meeting.created",
      "meeting",
      payload.meetingId,
      `scheduled meeting "${payload.title}"`,
    ).catch(() => void 0);
  }
}
