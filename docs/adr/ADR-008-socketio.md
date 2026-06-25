# ADR-008 — Use Socket.IO for Real-Time Communication

**Status:** Accepted **Date:** 2026-06 **Deciders:** GovSphere Engineering Team

---

## Context

GovSphere requires real-time features:

- Message delivery (new messages appear instantly in channels)
- Typing indicators
- User presence (online/offline/away)
- Read receipts
- Live notifications

The real-time transport must:

- Work reliably on DRC government networks (which may block raw WebSocket ports)
- Support multiple simultaneous API instances (horizontal scaling)
- Integrate cleanly with NestJS's WebSocket gateway system
- Be compatible with web, mobile (React Native), and desktop (Tauri) clients

## Decision

We will use **Socket.IO 4** with the **Redis adapter** (`@socket.io/redis-adapter`) for real-time
bidirectional communication.

NestJS's `@WebSocketGateway()` decorator exposes Socket.IO events alongside the REST API on the same
port. The Redis adapter enables Socket.IO events to propagate across multiple API instances.

## Alternatives Considered

**Raw WebSockets (ws library):**

- Rejected. No automatic reconnection, no room/namespace model, no transport fallback. Would require
  building all of these primitives ourselves. Socket.IO provides them out of the box.

**Server-Sent Events (SSE):**

- Considered for read-only push (notifications only). Rejected because SSE is one-directional —
  clients cannot send typing events or read receipts back over SSE. Would require a hybrid approach
  with HTTP for bidirectional events, complicating the architecture.

**MQTT:**

- Better suited for IoT. Not the right fit for a web application client model.

**NATS / RabbitMQ for real-time:**

- These are message brokers, not real-time client transport. They could be used for internal event
  propagation but not for browser/mobile client communication.

**Pusher / Ably (managed WebSocket):**

- Rejected. Requires sending government data to a third-party managed service. Data sovereignty
  requirement prohibits this.

## Consequences

**Positive:**

- Socket.IO falls back to HTTP long-polling if WebSocket is blocked by firewalls (critical for DRC
  government networks)
- Redis adapter broadcasts events to all connected clients across multiple API instances
- NestJS `@WebSocketGateway()` integrates cleanly with the existing module system
- Room-based model maps naturally to channels (`channel:{id}`) and direct messages
  (`dm:{userId1}:{userId2}`)
- Socket.IO clients available for browser, React Native, and Node.js

**Negative:**

- Socket.IO protocol is not standard WebSocket — clients must use the Socket.IO client library (not
  the raw WebSocket API)
- Redis adapter adds latency for cross-instance events (typically < 5ms on local Redis)
- Long-polling fallback is significantly less efficient than WebSocket

## Room Model

```
channel:{channelId}       — all members of a channel
dm:{userA}:{userB}        — direct message thread (user IDs sorted)
user:{userId}             — personal room (notifications, presence)
presence:{orgId}          — presence aggregation for an organization
```

## Events

| Event             | Direction                | Description                 |
| ----------------- | ------------------------ | --------------------------- |
| `message.new`     | Server → Client          | New message in a channel    |
| `message.edited`  | Server → Client          | Message was edited          |
| `message.deleted` | Server → Client          | Message was soft-deleted    |
| `reaction.added`  | Server → Client          | Reaction added to a message |
| `typing.start`    | Client → Server → Others | User started typing         |
| `typing.stop`     | Client → Server → Others | User stopped typing         |
| `presence.update` | Server → Client          | User online status changed  |

All Socket.IO connections require a valid JWT access token (passed in the handshake `auth.token`
field). Unauthenticated connections are rejected immediately.
