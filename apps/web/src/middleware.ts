/**
 * GovSphere middleware
 *
 * Runs on every request. Responsibilities:
 * 1. Protects /admin/* routes — redirects unauthenticated users to /login.
 * 2. Redirects authenticated users away from /login to /admin.
 * 3. Blocks MFA-pending sessions from accessing any admin route.
 * 4. Handles locale routing via next-intl (future — currently a no-op wrapper).
 */

import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { JWT } from "next-auth/jwt";

/** Routes that do not require authentication. */
const PUBLIC_ROUTES = ["/login", "/login/mfa", "/forgot-password", "/reset-password"];

/** Routes that should redirect authenticated users away. */
const AUTH_ONLY_ROUTES = ["/login", "/login/mfa", "/forgot-password", "/reset-password"];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + "/"));
}

function isAuthOnlyRoute(pathname: string): boolean {
  return AUTH_ONLY_ROUTES.some((route) => pathname === route || pathname.startsWith(route + "/"));
}

export default withAuth(
  function middleware(req: NextRequest & { nextauth: { token: JWT | null } }) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Redirect authenticated (non-MFA-pending) users away from auth pages
    if (token && !token["mfaRequired"] && isAuthOnlyRoute(pathname)) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    // Block MFA-pending sessions from admin routes
    if (token?.["mfaRequired"] === true && pathname.startsWith("/admin")) {
      return NextResponse.redirect(
        new URL(
          `/login/mfa?challengeToken=${encodeURIComponent(token["challengeToken"] as string)}`,
          req.url,
        ),
      );
    }

    // Block sessions with refresh error from admin
    if (token?.error === "RefreshTokenError" && pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/login?error=SessionExpired", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // authorized is called before the middleware function above.
      // Return false to redirect unauthenticated users to the signIn page.
      authorized({ token, req }) {
        const { pathname } = req.nextUrl;
        // Public routes are always authorised
        if (isPublicRoute(pathname)) return true;
        // Admin routes require a token (any token — MFA state is handled above)
        if (pathname.startsWith("/admin")) return token !== null;
        return true;
      },
    },
    pages: { signIn: "/login" },
  },
);

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico
     * - api/auth (NextAuth routes)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
};
