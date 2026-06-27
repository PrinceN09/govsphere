/**
 * Prinodia Workspace — EventBusService v1.2.0
 *
 * Thin, type-safe wrapper around NestJS EventEmitter2.
 *
 * Design:
 *  - All domain events flow through this single service.
 *  - Every subscriber gets a typed payload via the EventPayloadMap.
 *  - In-process today; swap to Redis pub/sub bridge for horizontal scaling.
 *
 * Usage (publish):
 *   this.eventBus.emit(EVENTS.USER_ONLINE, { userId, orgId, ... });
 *
 * Usage (subscribe in service):
 *   @OnEvent(EVENTS.USER_ONLINE)
 *   handleUserOnline(payload: PresenceUpdatedPayload) { ... }
 */

import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import type { EventName } from "./event-catalog";
import type { EventPayloadMap, BaseEventPayload } from "./event-payloads";

@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);

  constructor(private readonly emitter: EventEmitter2) {}

  /**
   * Publish a typed domain event.
   * Stamps `occurredAt` automatically if not provided.
   */
  emit<K extends EventName>(
    event: K,
    payload: K extends keyof EventPayloadMap
      ? Omit<EventPayloadMap[K], keyof BaseEventPayload> & Partial<BaseEventPayload>
      : Record<string, unknown>,
  ): void {
    const stamped = {
      occurredAt: new Date().toISOString(),
      ...payload,
    };

    this.logger.debug(`[EventBus] emit ${event}`);
    this.emitter.emit(event, stamped);
  }

  /**
   * Publish a typed domain event asynchronously (waits for all listeners).
   * Use for events that must be handled before the caller continues.
   */
  async emitAsync<K extends EventName>(
    event: K,
    payload: K extends keyof EventPayloadMap
      ? Omit<EventPayloadMap[K], keyof BaseEventPayload> & Partial<BaseEventPayload>
      : Record<string, unknown>,
  ): Promise<void> {
    const stamped = {
      occurredAt: new Date().toISOString(),
      ...payload,
    };

    this.logger.debug(`[EventBus] emitAsync ${event}`);
    await this.emitter.emitAsync(event, stamped);
  }
}
