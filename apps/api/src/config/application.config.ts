import { registerAs } from "@nestjs/config";

export type SupportedLanguage = "fr" | "en" | "ln" | "sw" | "lua";

export interface ApplicationConfig {
  nodeEnv: string;
  port: number;
  appName: string;
  appUrl: string;
  apiUrl: string;
  logLevel: string;
  bcryptRounds: number;
  rateLimit: {
    ttl: number;
    maxRequests: number;
  };
  mfa: {
    encryptionKey: string;
    issuer: string;
  };
  i18n: {
    defaultLanguage: SupportedLanguage;
    supportedLanguages: SupportedLanguage[];
    defaultTimezone: string;
    defaultCountryCode: string;
  };
  audit: {
    retentionDays: number;
  };
}

export const applicationConfig = registerAs(
  "app",
  (): ApplicationConfig => ({
    nodeEnv: process.env["NODE_ENV"] ?? "development",
    port: parseInt(process.env["PORT"] ?? "4000", 10),
    appName: process.env["APP_NAME"] ?? "GovSphere",
    appUrl: process.env["APP_URL"] ?? "http://localhost:3000",
    apiUrl: process.env["API_URL"] ?? "http://localhost:4000",
    logLevel: process.env["LOG_LEVEL"] ?? "info",
    bcryptRounds: parseInt(process.env["BCRYPT_ROUNDS"] ?? "12", 10),
    rateLimit: {
      ttl: parseInt(process.env["RATE_LIMIT_TTL"] ?? "60", 10),
      maxRequests: parseInt(process.env["RATE_LIMIT_MAX_REQUESTS"] ?? "100", 10),
    },
    mfa: {
      encryptionKey: process.env["MFA_ENCRYPTION_KEY"] ?? "",
      issuer: process.env["MFA_ISSUER"] ?? "GovSphere",
    },
    i18n: {
      defaultLanguage: (process.env["DEFAULT_LANGUAGE"] as SupportedLanguage) ?? "fr",
      supportedLanguages: (process.env["SUPPORTED_LANGUAGES"] ?? "fr,en,ln,sw,lua").split(
        ",",
      ) as SupportedLanguage[],
      defaultTimezone: process.env["DEFAULT_TIMEZONE"] ?? "Africa/Kinshasa",
      defaultCountryCode: process.env["DEFAULT_COUNTRY_CODE"] ?? "CD",
    },
    audit: {
      retentionDays: parseInt(process.env["AUDIT_LOG_RETENTION_DAYS"] ?? "365", 10),
    },
  }),
);
