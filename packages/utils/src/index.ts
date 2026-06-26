/**
 * @prinodia/utils
 *
 * Shared utility functions for Prinodia Workspace.
 * Pure functions with no framework dependencies.
 */

import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { enUS, fr } from "date-fns/locale";

import type { Locale } from "date-fns";

// ─── Date Utilities ───────────────────────────────────────────────────────────

const DATE_FNS_LOCALES: Record<string, Locale> = {
  fr,
  en: enUS,
  ln: fr, // Fall back to French for Lingala
  sw: fr, // Fall back to French for Swahili
  lua: fr, // Fall back to French for Tshiluba
};

/**
 * Formats a date for display in the message list (smart relative/absolute).
 */
export function formatMessageDate(date: Date, locale = "fr"): string {
  const dateFnsLocale = DATE_FNS_LOCALES[locale] ?? fr;
  if (isToday(date)) {
    return format(date, "HH:mm", { locale: dateFnsLocale });
  }
  if (isYesterday(date)) {
    return locale === "fr" ? `Hier ${format(date, "HH:mm")}` : `Yesterday ${format(date, "HH:mm")}`;
  }
  return format(date, "dd/MM/yyyy HH:mm", { locale: dateFnsLocale });
}

/**
 * Returns a human-readable relative time string.
 */
export function timeAgo(date: Date, locale = "fr"): string {
  const dateFnsLocale = DATE_FNS_LOCALES[locale] ?? fr;
  return formatDistanceToNow(date, { addSuffix: true, locale: dateFnsLocale });
}

// ─── String Utilities ─────────────────────────────────────────────────────────

/**
 * Generates initials from a full name (up to 2 characters).
 * "Jean-Pierre Kabila" → "JK"
 */
export function getInitials(name: string): string {
  return name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Truncates a string to a max length and appends ellipsis.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 3)}...`;
}

/**
 * Slugifies a string for use in URLs or channel names.
 * "Direction Générale" → "direction-generale"
 */
export function slugify(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // Remove diacritics
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

/**
 * Masks a matricule number for display (e.g. "1.641.***").
 */
export function maskMatricule(matricule: string): string {
  const parts = matricule.split(".");
  if (parts.length < 2) return "***";
  const lastPart = parts[parts.length - 1];
  const masked = lastPart ? "*".repeat(lastPart.length) : "***";
  return [...parts.slice(0, -1), masked].join(".");
}

// ─── File Utilities ───────────────────────────────────────────────────────────

/**
 * Formats file size in human-readable form.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"] as const;
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = bytes / Math.pow(1024, i);
  // `noUncheckedIndexedAccess` makes units[i] return `string | undefined`.
  // The `Math.min` clamp above guarantees i is always a valid index, but
  // TypeScript can't prove that statically. Fallback to "B" is harmless.
  const unit = units[i] ?? "B";
  return `${size.toFixed(i === 0 ? 0 : 1)} ${unit}`;
}

/**
 * Returns the file category based on MIME type.
 */
export function getFileCategory(
  mimeType: string,
): "DOCUMENT" | "IMAGE" | "VIDEO" | "AUDIO" | "ARCHIVE" | "OTHER" {
  if (mimeType.startsWith("image/")) return "IMAGE";
  if (mimeType.startsWith("video/")) return "VIDEO";
  if (mimeType.startsWith("audio/")) return "AUDIO";
  if (
    [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument",
      "text/plain",
      "text/csv",
    ].some((t) => mimeType.startsWith(t))
  )
    return "DOCUMENT";
  if (
    ["application/zip", "application/x-rar", "application/x-tar", "application/gzip"].includes(
      mimeType,
    )
  )
    return "ARCHIVE";
  return "OTHER";
}

// ─── Pagination Utilities ─────────────────────────────────────────────────────

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export function normalizePagination(
  params: PaginationParams,
  maxLimit = 200,
): { page: number; limit: number; skip: number; take: number } {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(Math.max(1, params.limit ?? 50), maxLimit);
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

// ─── Misc Utilities ───────────────────────────────────────────────────────────

/**
 * Generates a random color from a string (deterministic, for avatars).
 */
export function stringToColor(str: string): string {
  const colors = [
    "#1d5fc4",
    "#16a34a",
    "#dc2626",
    "#9333ea",
    "#ea580c",
    "#0891b2",
    "#be185d",
    "#854d0e",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length] ?? colors[0]!;
}

/**
 * Delays execution (for testing/dev use only).
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
