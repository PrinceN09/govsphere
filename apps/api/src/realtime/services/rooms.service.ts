/**
 * Prinodia Workspace — RoomsService v1.2.0
 *
 * Manages Socket.IO room membership.
 *
 * Room naming convention (matches roomKey() in socket.types.ts):
 *   org:{orgId}           — organization-wide broadcast
 *   dept:{deptId}         — department broadcast
 *   ch:{channelId}        — chat channel
 *   meet:{meetingId}      — meeting room
 *   canvas:{canvasId}     — canvas collaboration room
 *   proj:{projectId}      — project activity room
 *   doc:{documentId}      — document co-editing room
 *   user:{userId}         — personal notification room (private)
 *
 * Security invariant:
 *   - User room (user:{id}) is only joined/left by the gateway itself.
 *   - All other rooms require an authorization check before join.
 *   - Users can only join rooms within their own organization.
 */

import { Injectable, Logger } from "@nestjs/common";
import { Server } from "socket.io";

import { roomKey } from "../types/socket.types";

export type RoomType =
  | "WORKSPACE"
  | "ORGANIZATION"
  | "DEPARTMENT"
  | "CHANNEL"
  | "MEETING"
  | "CANVAS"
  | "PROJECT"
  | "DOCUMENT"
  | "USER";

export interface RoomMembership {
  userId: string;
  roomId: string;
  roomType: RoomType;
  joinedAt: string;
}

@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name);

  /**
   * Join a user's socket to a room.
   * The server reference is passed in (not injected) to avoid circular deps.
   */
  async joinRoom(
    server: Server,
    socketId: string,
    userId: string,
    roomType: RoomType,
    resourceId: string,
  ): Promise<string> {
    const room = roomKey(roomType, resourceId);
    const socket = server.sockets.sockets.get(socketId);

    if (!socket) {
      this.logger.warn(`[Rooms] socket ${socketId} not found for join ${room}`);
      return room;
    }

    await socket.join(room);
    this.logger.debug(`[Rooms] ${userId} joined ${room}`);
    return room;
  }

  /**
   * Remove a socket from a room.
   */
  async leaveRoom(server: Server, socketId: string, userId: string, roomId: string): Promise<void> {
    const socket = server.sockets.sockets.get(socketId);
    if (!socket) return;
    await socket.leave(roomId);
    this.logger.debug(`[Rooms] ${userId} left ${roomId}`);
  }

  /**
   * Remove a socket from ALL rooms (called on disconnect).
   */
  async leaveAllRooms(server: Server, socketId: string): Promise<void> {
    const socket = server.sockets.sockets.get(socketId);
    if (!socket) return;
    const rooms = [...socket.rooms].filter((r) => r !== socketId);
    for (const room of rooms) {
      await socket.leave(room);
    }
    this.logger.debug(`[Rooms] socket ${socketId} left all rooms`);
  }

  /**
   * Auto-join a user to their standard rooms on connection:
   *   - org:{orgId}        (organization broadcast)
   *   - user:{userId}      (personal notifications)
   */
  async joinDefaultRooms(
    server: Server,
    socketId: string,
    userId: string,
    orgId: string,
  ): Promise<void> {
    await this.joinRoom(server, socketId, userId, "ORGANIZATION", orgId);
    await this.joinRoom(server, socketId, userId, "USER", userId);
  }

  /**
   * Returns the number of sockets currently in a room.
   */
  async roomSize(server: Server, roomId: string): Promise<number> {
    const room = server.sockets.adapter.rooms.get(roomId);
    return room?.size ?? 0;
  }

  /**
   * Returns all room IDs a socket is currently in.
   */
  getRoomsForSocket(server: Server, socketId: string): string[] {
    const socket = server.sockets.sockets.get(socketId);
    if (!socket) return [];
    return [...socket.rooms].filter((r) => r !== socketId);
  }
}
