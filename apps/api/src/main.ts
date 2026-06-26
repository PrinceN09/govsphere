/**
 * Prinodia Workspace API — NestJS Bootstrap
 * Government of the Democratic Republic of Congo
 *
 * Startup sequence:
 *   1. Zod env validation (via AppModule → ConfigModule.forRoot({ validate }))
 *   2. Security middleware (helmet, CORS, cookie-parser)
 *   3. URI versioning (/v1/*)
 *   4. Swagger (dev / staging only)
 *   5. Listen
 */

import { VersioningType } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import compression from "compression";
import cookieParser from "cookie-parser";
import helmet from "helmet";

import { AppModule } from "./app.module";
import { AppLogger } from "./common/logger/logger.service";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    // Use Pino-based structured logger instead of NestJS default logger
    bufferLogs: true,
  });

  // Replace NestJS default logger with Pino
  const pinoLogger = app.get(AppLogger);
  pinoLogger.setContext("Bootstrap");
  app.useLogger(pinoLogger);

  const configService = app.get(ConfigService);
  const port = configService.get<number>("PORT", 4000);
  const nodeEnv = configService.get<string>("NODE_ENV", "development");
  const appUrl = configService.get<string>("APP_URL", "http://localhost:3000");

  // ── Security middleware ────────────────────────────────────────────────────
  app.use(
    helmet({
      // Explicit CSP: API only serves JSON — no scripts, no frames, no media.
      // Tighten in production; relax only what the Swagger UI requires in dev.
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          scriptSrc: nodeEnv === "production" ? ["'none'"] : ["'self'", "'unsafe-inline'"],
          styleSrc: nodeEnv === "production" ? ["'none'"] : ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:"],
          connectSrc: ["'self'"],
          fontSrc: ["'none'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'none'"],
          frameSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: nodeEnv === "production" ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: nodeEnv === "production",
      crossOriginOpenerPolicy: { policy: "same-origin" },
      crossOriginResourcePolicy: { policy: "same-site" },
      // Strict-Transport-Security: 2 years for production API
      hsts:
        nodeEnv === "production"
          ? { maxAge: 63_072_000, includeSubDomains: true, preload: true }
          : false,
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      noSniff: true,
      xssFilter: true,
      hidePoweredBy: true,
    }),
  );

  // ── Compression ───────────────────────────────────────────────────────────
  app.use(compression());

  // ── Cookie parser (required for HttpOnly refresh token cookie) ────────────
  app.use(cookieParser());

  // ── CORS ──────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: appUrl,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
    exposedHeaders: ["X-Request-ID"],
  });

  // ── API versioning ─────────────────────────────────────────────────────────
  app.enableVersioning({ type: VersioningType.URI });

  // ── Swagger (dev / staging only) ──────────────────────────────────────────
  if (nodeEnv !== "production") {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("Prinodia Workspace API")
      .setDescription(
        "Secure collaboration platform for the Government of the Democratic Republic of Congo. " +
          "All endpoints require authentication (Bearer JWT) unless marked @Public().",
      )
      .setVersion("0.1.0")
      .addBearerAuth({ type: "http", scheme: "bearer", bearerFormat: "JWT" }, "access-token")
      .addCookieAuth("govsphere_refresh")
      .addTag("Auth", "Authentication — login, refresh, logout, password reset")
      .addTag("Users", "User management")
      .addTag("Roles", "RBAC role assignment")
      .addTag("Sessions", "Session management")
      .addTag("MFA", "Multi-factor authentication")
      .addTag("Audit", "Immutable audit log")
      .addTag("Health", "Health and readiness checks")
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("docs", app, document, {
      swaggerOptions: { persistAuthorization: true },
    });

    pinoLogger.log(`Swagger available at http://localhost:${port}/docs`);
  }

  await app.listen(port);
  pinoLogger.log(`Prinodia Workspace API running on port ${port}`, {
    nodeEnv,
    port,
    appUrl,
  });
}

bootstrap().catch((err: unknown) => {
  console.error("Bootstrap failed:", err);
  process.exit(1);
});
