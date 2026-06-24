import type { UserRole } from "@govsphere/types";
import type { DefaultSession, DefaultJWT } from "next-auth";

/**
 * Augments the built-in NextAuth types to carry GovSphere-specific fields.
 * Session.user mirrors the fields stored in the JWT by auth.ts callbacks.
 */

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      displayName: string;
      email: string;
      matriculeNumber: string | null;
      role: UserRole;
      ministryId: string | null;
      sessionId: string;
      permissions: string[];
    } & DefaultSession["user"];
    accessToken: string;
    error?: "RefreshTokenError";
  }

  interface User {
    id: string;
    displayName: string;
    email: string;
    matriculeNumber: string | null;
    role: UserRole;
    ministryId: string | null;
    sessionId: string;
    permissions: string[];
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: number;
    /** Set when login requires MFA — challengeToken passed to MFA page. */
    mfaRequired?: boolean;
    challengeToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    displayName: string;
    email: string;
    matriculeNumber: string | null;
    role: UserRole;
    ministryId: string | null;
    sessionId: string;
    permissions: string[];
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: number;
    error?: "RefreshTokenError";
  }
}
