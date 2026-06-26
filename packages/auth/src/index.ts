/**
 * @prinodia/auth
 *
 * Authentication utilities, permission checks, and RBAC helpers.
 * These are pure helpers — no NestJS/Next.js dependencies.
 */

// UserRole is imported as a VALUE (not `import type`) because:
// 1. ROLE_HIERARCHY uses it as an index type (type position — fine either way)
// 2. isAdmin / isSuperOrGovAdmin call hasRole(role, UserRole.MINISTRY_ADMIN)
//    which requires the enum to exist at runtime as a JavaScript object.
//    `import type` erases the import at compile time and causes a runtime error.
import { UserRole } from "@prinodia/types";
import { z } from "zod";

// ─── Role Hierarchy ───────────────────────────────────────────────────────────

/**
 * Role power level — higher number = more permissions.
 * Used for role comparison checks.
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: 100,
  [UserRole.GOVERNMENT_ADMIN]: 90,
  [UserRole.MINISTRY_ADMIN]: 70,
  [UserRole.DEPARTMENT_ADMIN]: 50,
  [UserRole.DIVISION_ADMIN]: 40,
  [UserRole.TEAM_MANAGER]: 30,
  [UserRole.EMPLOYEE]: 10,
  [UserRole.GUEST]: 0,
};

/**
 * Returns true if the given role has at least the required permission level.
 *
 * Uses `?? 0` because TypeScript's `noUncheckedIndexedAccess` flag makes
 * Record<K, V>[K] return `V | undefined` even when K is a finite enum.
 * The fallback of 0 is safe — an unknown role gets the lowest permissions.
 */
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 0);
}

/**
 * Returns true if the user is any kind of admin (Ministry level or above).
 */
export function isAdmin(role: UserRole): boolean {
  return hasRole(role, UserRole.MINISTRY_ADMIN);
}

/**
 * Returns true if the user is a super admin or government admin.
 */
export function isSuperOrGovAdmin(role: UserRole): boolean {
  return hasRole(role, UserRole.GOVERNMENT_ADMIN);
}

// ─── Login Credential Validators ─────────────────────────────────────────────

/**
 * Validates DRC government matricule number format.
 * Examples: "1.641.558", "478.432", "424.55"
 */
export const matriculeSchema = z
  .string()
  .min(3, "Matricule number is too short")
  .max(20, "Matricule number is too long")
  .regex(
    /^\d{1,3}(\.\d{2,3}){1,3}$/,
    "Invalid matricule format. Expected format: 1.641.558 or 478.432",
  );

export const loginWithMatriculeSchema = z.object({
  matriculeNumber: matriculeSchema,
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginWithEmailSchema = z.object({
  email: z
    .string()
    .email("Invalid email address")
    .refine(
      (email) => !email.includes("+"),
      "Email aliases are not allowed for government accounts",
    ),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(12, "Password must be at least 12 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type LoginWithMatricule = z.infer<typeof loginWithMatriculeSchema>;
export type LoginWithEmail = z.infer<typeof loginWithEmailSchema>;
export type ChangePassword = z.infer<typeof changePasswordSchema>;

// ─── Permission Utilities ─────────────────────────────────────────────────────

export interface PermissionContext {
  userRole: UserRole;
  userMinistryId: string | null;
  userDepartmentId: string | null;
}

export interface ResourceContext {
  ministryId?: string | null;
  departmentId?: string | null;
  ownerId?: string;
}

/**
 * Checks if a user can access a resource scoped to a ministry/department.
 *
 * Access rules (checked in order):
 * 1. Super/Gov admins bypass all scoping.
 * 2. Ministry-scoped resource: user must be in that ministry.
 * 3. Department-scoped resource: user must be in that dept,
 *    unless they are a Ministry Admin (who can see all departments).
 * 4. Resource owners always have access to their own resources.
 */
export function canAccessResource(
  user: PermissionContext & { id: string },
  resource: ResourceContext,
): boolean {
  // Super/Gov admins can access everything
  if (isSuperOrGovAdmin(user.userRole)) return true;

  // If resource is ministry-scoped, user must belong to that ministry
  if (resource.ministryId && user.userMinistryId !== resource.ministryId) {
    return false;
  }

  // If resource is department-scoped, user must belong to that department
  if (resource.departmentId && user.userDepartmentId !== resource.departmentId) {
    // Ministry admins can access all departments within their ministry
    if (hasRole(user.userRole, UserRole.MINISTRY_ADMIN)) return true;
    return false;
  }

  // Owner can always access their own resource
  if (resource.ownerId && resource.ownerId === user.id) return true;

  return true;
}
