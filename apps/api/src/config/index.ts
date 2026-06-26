/**
 * Prinodia Workspace API — Configuration barrel
 *
 * All typed configuration modules are exported from here.
 * Import into AppModule via ConfigModule.forRoot({ load: [...] }).
 */

export { applicationConfig } from "./application.config";
export type { ApplicationConfig, SupportedLanguage } from "./application.config";

export { databaseConfig } from "./database.config";
export type { DatabaseConfig } from "./database.config";

export { jwtConfig } from "./jwt.config";
export type { JwtConfig } from "./jwt.config";

export { mailConfig } from "./mail.config";
export type { MailConfig } from "./mail.config";

export { redisConfig } from "./redis.config";
export type { RedisConfig } from "./redis.config";

export { storageConfig } from "./storage.config";
export type { StorageConfig } from "./storage.config";

export { validateEnv } from "./env.validation";
export type { EnvConfig } from "./env.validation";
