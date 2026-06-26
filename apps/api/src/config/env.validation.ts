/**
 * Prinodia Workspace — Environment Variable Validation
 *
 * Uses Zod to validate all required environment variables at startup.
 * The application WILL NOT START if required variables are missing or invalid.
 * This prevents silent misconfiguration in production.
 */

import { z } from "zod";

const envSchema = z.object({
  // ── Application ────────────────────────────────────────────────────────────
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  APP_NAME: z.string().min(1).default("Prinodia Workspace"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  API_URL: z.string().url().default("http://localhost:4000"),

  // ── Database ───────────────────────────────────────────────────────────────
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .startsWith("postgresql://", "DATABASE_URL must be a PostgreSQL connection string"),

  // ── Redis ──────────────────────────────────────────────────────────────────
  REDIS_URL: z.string().min(1, "REDIS_URL is required").default("redis://localhost:6379"),
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().int().min(0).default(0),
  BULLMQ_REDIS_DB: z.coerce.number().int().min(0).default(1),

  // ── JWT (RS256 asymmetric) ─────────────────────────────────────────────────
  JWT_PRIVATE_KEY: z
    .string()
    .min(1, "JWT_PRIVATE_KEY is required")
    .refine(
      (v) => !v.startsWith("CHANGE_ME"),
      "JWT_PRIVATE_KEY must be set to a real RS256 private key (base64-encoded PEM)",
    ),
  JWT_PUBLIC_KEY: z
    .string()
    .min(1, "JWT_PUBLIC_KEY is required")
    .refine(
      (v) => !v.startsWith("CHANGE_ME"),
      "JWT_PUBLIC_KEY must be set to a real RS256 public key (base64-encoded PEM)",
    ),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  // ── MFA Encryption ─────────────────────────────────────────────────────────
  MFA_ENCRYPTION_KEY: z
    .string()
    .length(64, "MFA_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)")
    .regex(/^[0-9a-fA-F]{64}$/, "MFA_ENCRYPTION_KEY must be a hex string")
    .refine(
      (v) => !v.startsWith("CHANGE_ME"),
      "MFA_ENCRYPTION_KEY must be set to a real 64-char hex key",
    ),
  MFA_ISSUER: z.string().default("Prinodia Workspace"),

  // ── MinIO ──────────────────────────────────────────────────────────────────
  MINIO_ENDPOINT: z.string().min(1).default("localhost"),
  MINIO_PORT: z.coerce.number().int().positive().default(9000),
  MINIO_USE_SSL: z.coerce.boolean().default(false),
  MINIO_ACCESS_KEY: z
    .string()
    .min(1, "MINIO_ACCESS_KEY is required")
    .refine((v) => !v.startsWith("CHANGE_ME"), "MINIO_ACCESS_KEY must be set"),
  MINIO_SECRET_KEY: z
    .string()
    .min(1, "MINIO_SECRET_KEY is required")
    .refine((v) => !v.startsWith("CHANGE_ME"), "MINIO_SECRET_KEY must be set"),
  MINIO_BUCKET_FILES: z.string().default("govsphere-files"),
  MINIO_BUCKET_AVATARS: z.string().default("govsphere-avatars"),
  MINIO_BUCKET_DOCUMENTS: z.string().default("govsphere-documents"),
  MINIO_PUBLIC_URL: z.string().url().default("http://localhost:9000"),

  // ── Email ──────────────────────────────────────────────────────────────────
  SMTP_HOST: z.string().min(1).default("localhost"),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM_NAME: z.string().default("Prinodia Workspace"),
  SMTP_FROM_EMAIL: z.string().email().default("noreply@govsphere.gouv.cd"),

  // ── Security ───────────────────────────────────────────────────────────────
  RATE_LIMIT_TTL: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),

  // ── Logging ────────────────────────────────────────────────────────────────
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
  AUDIT_LOG_RETENTION_DAYS: z.coerce.number().int().positive().default(365),

  // ── File Upload ────────────────────────────────────────────────────────────
  MAX_FILE_SIZE_MB: z.coerce.number().int().positive().default(50),

  // ── Government Defaults ────────────────────────────────────────────────────
  DEFAULT_COUNTRY_CODE: z.string().length(2).default("CD"),
  DEFAULT_TIMEZONE: z.string().default("Africa/Kinshasa"),
  DEFAULT_LANGUAGE: z.enum(["fr", "en", "ln", "sw", "lua"]).default("fr"),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validates process.env against the schema.
 * Called by ConfigModule.forRoot({ validate }) in AppModule.
 * Throws a descriptive error and exits the process on validation failure.
 */
export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  • ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    console.error(
      `\n❌ Prinodia Workspace failed to start — invalid environment configuration:\n\n${errors}\n\n` +
        `Fix the above variables in your .env file and restart the server.\n`,
    );

    process.exit(1);
  }

  return result.data;
}
