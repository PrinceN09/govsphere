/**
 * Prinodia Workspace — EventsModule v1.2.0
 *
 * Registers @nestjs/event-emitter globally so every module can subscribe
 * to domain events using @OnEvent() without importing EventEmitterModule.
 *
 * All domain events flow through EventBusService (apps/api/src/realtime).
 * Publishers: any service via EventBusService.emit()
 * Subscribers: @OnEvent(EVENTS.xxx) decorators in any service
 *
 * Future horizontal scaling: replace in-process emit with Redis pub/sub
 * by swapping EventEmitter2.emit → ioredis.publish in EventBusService.
 *
 * @see https://docs.nestjs.com/techniques/events
 */

import { Global, Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";

@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: true, // allows "presence.*" pattern subscriptions
      delimiter: ".", // "domain.entity.action" naming convention
      maxListeners: 20, // warn on potential listener leaks
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),
  ],
  exports: [EventEmitterModule],
})
export class EventsModule {}
