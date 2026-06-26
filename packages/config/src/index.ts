/**
 * @prinodia/config
 *
 * Shared configuration schemas and environment variable validation.
 * Uses Zod for runtime validation.
 */

import { z } from "zod";

// ─── Environment Schema ───────────────────────────────────────────────────────

export const baseEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  APP_NAME: z.string().default("Prinodia Workspace"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  API_URL: z.string().url().default("http://localhost:4000"),
});

export const databaseEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SHADOW_DATABASE_URL: z.string().optional(),
});

export const redisEnvSchema = z.object({
  REDIS_URL: z.string().default("redis://localhost:6379"),
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
});

export const minioEnvSchema = z.object({
  MINIO_ENDPOINT: z.string().default("localhost"),
  MINIO_PORT: z.coerce.number().default(9000),
  MINIO_USE_SSL: z.coerce.boolean().default(false),
  MINIO_ACCESS_KEY: z.string().min(1, "MINIO_ACCESS_KEY is required"),
  MINIO_SECRET_KEY: z.string().min(1, "MINIO_SECRET_KEY is required"),
  MINIO_BUCKET_FILES: z.string().default("govsphere-files"),
  MINIO_BUCKET_AVATARS: z.string().default("govsphere-avatars"),
  MINIO_BUCKET_DOCUMENTS: z.string().default("govsphere-documents"),
});

export const jwtEnvSchema = z.object({
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
});

export const apiEnvSchema = baseEnvSchema
  .merge(databaseEnvSchema)
  .merge(redisEnvSchema)
  .merge(minioEnvSchema)
  .merge(jwtEnvSchema)
  .extend({
    PORT: z.coerce.number().default(4000),
    BCRYPT_ROUNDS: z.coerce.number().default(12),
    RATE_LIMIT_TTL: z.coerce.number().default(60),
    RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
    MAX_FILE_SIZE_MB: z.coerce.number().default(50),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    AUDIT_LOG_RETENTION_DAYS: z.coerce.number().default(365),
    DEFAULT_LANGUAGE: z.enum(["fr", "en", "ln", "sw", "lua"]).default("fr"),
    DEFAULT_TIMEZONE: z.string().default("Africa/Kinshasa"),
    SMTP_HOST: z.string().default("localhost"),
    SMTP_PORT: z.coerce.number().default(1025),
    SMTP_FROM_EMAIL: z.string().email().default("noreply@govsphere.gouv.cd"),
    SMTP_FROM_NAME: z.string().default("Prinodia Workspace"),
  });

export type ApiEnv = z.infer<typeof apiEnvSchema>;

export const webEnvSchema = baseEnvSchema.extend({
  NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be at least 32 characters"),
  NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:4000"),
  NEXT_PUBLIC_WS_URL: z.string().default("ws://localhost:4000"),
  NEXT_PUBLIC_APP_NAME: z.string().default("Prinodia Workspace"),
  NEXT_PUBLIC_APP_VERSION: z.string().default("0.1.0"),
});

export type WebEnv = z.infer<typeof webEnvSchema>;

// ─── Constants ────────────────────────────────────────────────────────────────

export const GOVSPHERE_CONSTANTS = {
  // Government hierarchy
  HIERARCHY: ["Government", "Ministry", "Department", "Division", "Team", "Channel"] as const,

  // DRC defaults
  DEFAULT_COUNTRY: "CD",
  DEFAULT_TIMEZONE: "Africa/Kinshasa",
  DEFAULT_LANGUAGE: "fr",

  // File limits
  MAX_FILE_SIZE_BYTES: 50 * 1024 * 1024, // 50 MB
  ALLOWED_MIME_TYPES: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "video/mp4",
    "audio/mpeg",
  ] as const,

  // Pagination defaults
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 200,

  // Message limits
  MAX_MESSAGE_LENGTH: 4000,
  MAX_CHANNEL_NAME_LENGTH: 80,
  MAX_CHANNEL_DESCRIPTION_LENGTH: 250,

  // Security
  BCRYPT_ROUNDS: 12,
  SESSION_MAX_AGE: 7 * 24 * 60 * 60, // 7 days in seconds
  MFA_TOKEN_LENGTH: 6,
  MFA_TOKEN_EXPIRY_SECONDS: 30,

  // Matricule number format for DRC government employees
  // Examples: "1.641.558", "478.432", "424.55"
  MATRICULE_REGEX: /^\d{1,3}(\.\d{1,3}){1,3}$/,
} as const;
