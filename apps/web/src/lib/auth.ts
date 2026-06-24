/**
 * NextAuth configuration for GovSphere.
 *
 * Strategy:
 * - Two CredentialsProviders:
 *   1. "credentials" — handles email/matricule + password login.
 *      Returns { mfaRequired, challengeToken } on MFA-required logins;
 *      the login page detects this and redirects to /login/mfa.
 *   2. "mfa" — called from the MFA verification page with challengeToken + code.
 *
 * Token lifecycle:
 * - Access token (RS256, 15 min) stored in the NextAuth JWT.
 * - Refresh token stored in the NextAuth JWT (captured from Set-Cookie header
 *   during initial login).
 * - jwt() callback refreshes the access token server-side before it expires.
 */

import Credentials from "next-auth/providers/credentials";

import type { UserRole } from "@govsphere/types";
import type { AuthOptions, User } from "next-auth";
import type { JWT } from "next-auth/jwt";

const API_URL = process.env["API_URL"] ?? "http://localhost:3001";

// ─── Shared types ─────────────────────────────────────────────────────────────

interface ApiUserProfile {
  id: string;
  displayName: string;
  email: string;
  matriculeNumber: string | null;
  role: UserRole;
  ministryId: string | null;
  sessionId: string;
  permissions: string[];
}

interface ApiLoginSuccess {
  accessToken: string;
  user: ApiUserProfile;
  sessionId: string;
}

interface ApiMfaRequired {
  mfaRequired: true;
  challengeToken: string;
}

interface ApiMfaVerifySuccess {
  accessToken: string;
  user: ApiUserProfile;
  sessionId: string;
}

interface ApiRefreshSuccess {
  accessToken: string;
}

// ─── Token refresh ────────────────────────────────────────────────────────────

/** Parses JWT expiry (in seconds) from a base64-encoded payload. */
function getTokenExpiry(jwt: string): number {
  try {
    const payload = JSON.parse(Buffer.from(jwt.split(".")[1] ?? "", "base64url").toString()) as {
      exp?: number;
    };
    return (payload.exp ?? 0) * 1000; // convert to ms
  } catch {
    return 0;
  }
}

/** Extracts the refresh token value from a Set-Cookie header string. */
function extractRefreshToken(setCookieHeader: string | string[] | undefined): string {
  const headers = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader ?? ""];
  for (const h of headers) {
    const match = /govsphere_refresh=([^;]+)/.exec(h);
    if (match?.[1]) return match[1];
  }
  return "";
}

/** Calls the NestJS refresh endpoint, passing the stored refresh token as a cookie. */
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const response = await fetch(`${API_URL}/v1/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `govsphere_refresh=${token.refreshToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Refresh failed: ${response.status.toString()}`);
    }

    const setCookie = response.headers.get("set-cookie");
    const body = (await response.json()) as ApiRefreshSuccess;
    const newRefreshToken = extractRefreshToken(setCookie ?? undefined);

    // Omit `error` key entirely on success (exactOptionalPropertyTypes: true)
    const { error: _removed, ...rest } = token;
    void _removed;
    return {
      ...rest,
      accessToken: body.accessToken,
      accessTokenExpiresAt: getTokenExpiry(body.accessToken),
      refreshToken: newRefreshToken || token.refreshToken,
    };
  } catch {
    return { ...token, error: "RefreshTokenError" as const };
  }
}

// ─── Fetch user permissions ───────────────────────────────────────────────────

async function fetchPermissions(accessToken: string): Promise<string[]> {
  try {
    const response = await fetch(`${API_URL}/v1/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return [];
    const profile = (await response.json()) as { permissions?: string[] };
    return profile.permissions ?? [];
  } catch {
    return [];
  }
}

// ─── NextAuth options ─────────────────────────────────────────────────────────

export const authOptions: AuthOptions = {
  providers: [
    // ── 1. Standard credential login ─────────────────────────────────────────
    Credentials({
      id: "credentials",
      name: "GovSphere",
      credentials: {
        credential: { label: "Matricule or Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials): Promise<User | null> {
        if (!credentials?.credential || !credentials.password) return null;

        const response = await fetch(`${API_URL}/v1/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            credential: credentials.credential,
            password: credentials.password,
          }),
        });

        if (response.status === 202) {
          // MFA required — return a sentinel user so the jwt callback can signal MFA
          const body = (await response.json()) as ApiMfaRequired;
          return {
            id: "mfa-pending",
            displayName: "",
            email: credentials.credential,
            matriculeNumber: null,
            role: "GUEST" as UserRole,
            ministryId: null,
            sessionId: "",
            permissions: [],
            accessToken: "",
            refreshToken: "",
            accessTokenExpiresAt: 0,
            mfaRequired: true,
            challengeToken: body.challengeToken,
          } satisfies User;
        }

        if (!response.ok) return null;

        const setCookie = response.headers.get("set-cookie");
        const body = (await response.json()) as ApiLoginSuccess;
        const refreshToken = extractRefreshToken(setCookie ?? undefined);
        const permissions = await fetchPermissions(body.accessToken);

        return {
          id: body.user.id,
          displayName: body.user.displayName,
          email: body.user.email,
          matriculeNumber: body.user.matriculeNumber,
          role: body.user.role,
          ministryId: body.user.ministryId,
          sessionId: body.sessionId,
          permissions,
          accessToken: body.accessToken,
          refreshToken,
          accessTokenExpiresAt: getTokenExpiry(body.accessToken),
        } satisfies User;
      },
    }),

    // ── 2. MFA verification ───────────────────────────────────────────────────
    Credentials({
      id: "mfa",
      name: "GovSphere MFA",
      credentials: {
        challengeToken: { label: "Challenge Token", type: "text" },
        code: { label: "TOTP Code", type: "text" },
        backupCode: { label: "Backup Code", type: "text" },
      },
      async authorize(credentials): Promise<User | null> {
        if (!credentials?.challengeToken) return null;
        if (!credentials.code && !credentials.backupCode) return null;

        const response = await fetch(`${API_URL}/v1/auth/mfa/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            challengeToken: credentials.challengeToken,
            ...(credentials.code ? { code: credentials.code } : {}),
            ...(credentials.backupCode ? { backupCode: credentials.backupCode } : {}),
          }),
        });

        if (!response.ok) return null;

        const setCookie = response.headers.get("set-cookie");
        const body = (await response.json()) as ApiMfaVerifySuccess;
        const refreshToken = extractRefreshToken(setCookie ?? undefined);
        const permissions = await fetchPermissions(body.accessToken);

        return {
          id: body.user.id,
          displayName: body.user.displayName,
          email: body.user.email,
          matriculeNumber: body.user.matriculeNumber,
          role: body.user.role,
          ministryId: body.user.ministryId,
          sessionId: body.sessionId,
          permissions,
          accessToken: body.accessToken,
          refreshToken,
          accessTokenExpiresAt: getTokenExpiry(body.accessToken),
        } satisfies User;
      },
    }),
  ],

  session: { strategy: "jwt" },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  callbacks: {
    // ── jwt: build/refresh the JWT ───────────────────────────────────────────
    async jwt({ token, user }) {
      // Initial sign-in — prime the token from the User object
      if (user) {
        return {
          ...token,
          id: user.id,
          displayName: user.displayName,
          email: user.email,
          matriculeNumber: user.matriculeNumber,
          role: user.role,
          ministryId: user.ministryId,
          sessionId: user.sessionId,
          permissions: user.permissions,
          accessToken: user.accessToken,
          refreshToken: user.refreshToken,
          accessTokenExpiresAt: user.accessTokenExpiresAt,
          ...(user.mfaRequired !== undefined && { mfaRequired: user.mfaRequired }),
          ...(user.challengeToken !== undefined && { challengeToken: user.challengeToken }),
        };
      }

      // MFA pending — propagate sentinel state without refresh
      if (token["mfaRequired"] === true) return token;

      // Refresh if within 2 minutes of expiry
      if (Date.now() < (token.accessTokenExpiresAt ?? 0) - 120_000) {
        return token;
      }

      return refreshAccessToken(token);
    },

    // ── session: expose fields to client ─────────────────────────────────────
    session({ session, token }) {
      session.accessToken = token.accessToken;
      if (token.error !== undefined) {
        session.error = token.error;
      }
      session.user = {
        ...session.user,
        id: token.id,
        displayName: token.displayName,
        email: token.email,
        matriculeNumber: token.matriculeNumber,
        role: token.role,
        ministryId: token.ministryId,
        sessionId: token.sessionId,
        permissions: token.permissions,
      };
      return session;
    },
  },

  secret: process.env["NEXTAUTH_SECRET"] ?? "dev-secret-change-in-production",
};
