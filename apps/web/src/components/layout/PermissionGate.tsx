"use client";

import { useSession } from "next-auth/react";

import { hasPermission, hasAnyPermission, hasAllPermissions } from "@/lib/permissions";

interface PermissionGateProps {
  /** Show children only if user has this single permission. */
  permission?: string;
  /** Show children only if user has ALL of these permissions. */
  allOf?: string[];
  /** Show children if user has ANY of these permissions. */
  anyOf?: string[];
  /** What to render when permission is denied (default: nothing). */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Renders children only when the current session holds the required permission(s).
 * Renders `fallback` (or nothing) otherwise.
 *
 * Usage:
 *   <PermissionGate permission="MINISTRY:CREATE">
 *     <Button>Créer un ministère</Button>
 *   </PermissionGate>
 */
export function PermissionGate({
  permission,
  allOf,
  anyOf,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { data: session } = useSession();
  const permissions = session?.user.permissions ?? [];

  let granted = true;

  if (permission !== undefined) {
    granted = hasPermission(permissions, permission);
  } else if (allOf !== undefined) {
    granted = hasAllPermissions(permissions, allOf);
  } else if (anyOf !== undefined) {
    granted = hasAnyPermission(permissions, anyOf);
  }

  return granted ? <>{children}</> : <>{fallback}</>;
}
