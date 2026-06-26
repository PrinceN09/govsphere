import { registerAs } from "@nestjs/config";

export interface MailConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
  from: {
    name: string;
    email: string;
  };
}

export const mailConfig = registerAs(
  "mail",
  (): MailConfig => ({
    host: process.env["SMTP_HOST"] ?? "localhost",
    port: parseInt(process.env["SMTP_PORT"] ?? "1025", 10),
    secure: process.env["SMTP_SECURE"] === "true",
    // exactOptionalPropertyTypes: only include user/password when defined.
    ...(process.env["SMTP_USER"] !== undefined && { user: process.env["SMTP_USER"] }),
    ...(process.env["SMTP_PASSWORD"] !== undefined && { password: process.env["SMTP_PASSWORD"] }),
    from: {
      name: process.env["SMTP_FROM_NAME"] ?? "Prinodia Workspace",
      email: process.env["SMTP_FROM_EMAIL"] ?? "noreply@govsphere.gouv.cd",
    },
  }),
);
