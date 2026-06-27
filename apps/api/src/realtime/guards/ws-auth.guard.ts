/**
 * Prinodia Workspace — WsAuthGuard v1.2.0
 *
 * Authenticates WebSocket connections using a JWT passed in the handshake.
 *
 * Token delivery (client must send ONE of):
 *   socket.auth = { token: "<jwt>" }            ← preferred
 *   socket.handshake.headers.authorization      ← Bearer <jwt>
 *   socket.handshake.query.token                ← fallback (less secure)
 *
 * On success: attaches { userId, orgId, displayName, email, role } to socket.data
 * On failure: disconnects immediately with "unauthorized" event
 */

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

import type { AuthenticatedSocket } from "../types/socket.types";

interface JwtPayload {
  sub: string;
  orgId: string;
  displayName?: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class WsAuthGuard implements CanActivate {
  private readonly logger = new Logger(WsAuthGuard.name);

  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<AuthenticatedSocket>();

    const token = this.extractToken(client);
    if (!token) {
      this.reject(client, "No authentication token provided");
      return false;
    }

    try {
      const payload = this.jwt.verify<JwtPayload>(token);
      client.data = {
        userId: payload.sub,
        orgId: payload.orgId,
        displayName: payload.displayName ?? payload.email,
        email: payload.email,
        role: payload.role,
        deviceType: "WEB",
      };
      return true;
    } catch (err) {
      this.reject(client, "Invalid or expired token");
      this.logger.debug(`WsAuth rejected: ${String(err)}`);
      return false;
    }
  }

  private extractToken(client: AuthenticatedSocket): string | null {
    // 1. socket.auth.token
    const authData = client.handshake.auth as Record<string, unknown> | undefined;
    if (authData?.["token"] && typeof authData["token"] === "string") {
      return authData["token"];
    }

    // 2. Authorization header: "Bearer <token>"
    const header = client.handshake.headers.authorization;
    if (header?.startsWith("Bearer ")) {
      return header.slice(7);
    }

    // 3. Query string (least secure, last resort)
    const query = client.handshake.query["token"];
    if (typeof query === "string") return query;

    return null;
  }

  private reject(client: AuthenticatedSocket, reason: string): void {
    client.emit("error", { code: "UNAUTHORIZED", message: reason });
    client.disconnect(true);
    throw new UnauthorizedException(reason);
  }
}
