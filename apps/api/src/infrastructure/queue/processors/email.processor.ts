/**
 * GovSphere — Email Processor
 *
 * Consumes jobs from the "email" Bull queue and delivers them via SMTP (nodemailer).
 * Runs out-of-process relative to the HTTP request, so email delivery does not
 * block API response time.
 *
 * Job types:
 *   password-reset — one-time token link to /auth/reset-password
 *   welcome        — new employee onboarding email with platform intro
 *   invitation     — employee invite with token link to set up their account
 *   mfa-code       — OTP code for email-based MFA
 */

import { OnQueueActive, OnQueueCompleted, OnQueueFailed, Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";

import { EMAIL_JOBS, QUEUES } from "../queues";

import type { Job } from "bull";

// ── Job payload interfaces ────────────────────────────────────────────────────

export interface PasswordResetJobData {
  to: string;
  displayName: string;
  resetUrl: string;
  expiresMinutes: number;
}

export interface WelcomeJobData {
  to: string;
  displayName: string;
  loginUrl: string;
  ministryName: string;
}

export interface InvitationJobData {
  to: string;
  displayName: string;
  inviteUrl: string;
  invitedBy: string;
  ministryName: string;
  expiresHours: number;
}

export interface MfaCodeJobData {
  to: string;
  displayName: string;
  code: string;
  expiresMinutes: number;
}

// ── Processor ────────────────────────────────────────────────────────────────

@Processor(QUEUES.EMAIL)
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly fromName: string;
  private readonly fromEmail: string;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>("mail.host") ?? "localhost";
    const port = this.config.get<number>("mail.port") ?? 1025;
    const secure = this.config.get<boolean>("mail.secure") ?? false;
    const user = this.config.get<string | undefined>("mail.user");
    const pass = this.config.get<string | undefined>("mail.password");

    this.fromName = this.config.get<string>("mail.from.name") ?? "GovSphere";
    this.fromEmail = this.config.get<string>("mail.from.email") ?? "noreply@govsphere.gouv.cd";

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      ...(user !== undefined && pass !== undefined ? { auth: { user, pass } } : {}),
    });
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  @Process(EMAIL_JOBS.PASSWORD_RESET)
  async handlePasswordReset(job: Job<PasswordResetJobData>): Promise<void> {
    const { to, displayName, resetUrl, expiresMinutes } = job.data;

    await this.transporter.sendMail({
      from: `"${this.fromName}" <${this.fromEmail}>`,
      to,
      subject: "Réinitialisation de votre mot de passe GovSphere",
      html: `
        <p>Bonjour ${displayName},</p>
        <p>Une demande de réinitialisation de mot de passe a été reçue pour votre compte.</p>
        <p>
          <a href="${resetUrl}" style="
            display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;
            border-radius:6px;text-decoration:none;font-weight:600
          ">Réinitialiser mon mot de passe</a>
        </p>
        <p>Ce lien expire dans <strong>${expiresMinutes} minutes</strong>.</p>
        <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet e-mail.</p>
        <hr/>
        <p style="color:#6b7280;font-size:12px">GovSphere — Plateforme du Gouvernement de la RDC</p>
      `,
    });
  }

  @Process(EMAIL_JOBS.WELCOME)
  async handleWelcome(job: Job<WelcomeJobData>): Promise<void> {
    const { to, displayName, loginUrl, ministryName } = job.data;

    await this.transporter.sendMail({
      from: `"${this.fromName}" <${this.fromEmail}>`,
      to,
      subject: "Bienvenue sur GovSphere",
      html: `
        <p>Bonjour ${displayName},</p>
        <p>
          Votre compte GovSphere pour le <strong>${ministryName}</strong> a été créé avec succès.
        </p>
        <p>
          <a href="${loginUrl}" style="
            display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;
            border-radius:6px;text-decoration:none;font-weight:600
          ">Accéder à la plateforme</a>
        </p>
        <hr/>
        <p style="color:#6b7280;font-size:12px">GovSphere — Plateforme du Gouvernement de la RDC</p>
      `,
    });
  }

  @Process(EMAIL_JOBS.INVITATION)
  async handleInvitation(job: Job<InvitationJobData>): Promise<void> {
    const { to, displayName, inviteUrl, invitedBy, ministryName, expiresHours } = job.data;

    await this.transporter.sendMail({
      from: `"${this.fromName}" <${this.fromEmail}>`,
      to,
      subject: `Invitation à rejoindre GovSphere — ${ministryName}`,
      html: `
        <p>Bonjour ${displayName},</p>
        <p>
          <strong>${invitedBy}</strong> vous invite à rejoindre GovSphere pour le compte du
          <strong>${ministryName}</strong>.
        </p>
        <p>
          <a href="${inviteUrl}" style="
            display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;
            border-radius:6px;text-decoration:none;font-weight:600
          ">Accepter l&apos;invitation</a>
        </p>
        <p>Ce lien expire dans <strong>${expiresHours} heures</strong>.</p>
        <hr/>
        <p style="color:#6b7280;font-size:12px">GovSphere — Plateforme du Gouvernement de la RDC</p>
      `,
    });
  }

  @Process(EMAIL_JOBS.MFA_CODE)
  async handleMfaCode(job: Job<MfaCodeJobData>): Promise<void> {
    const { to, displayName, code, expiresMinutes } = job.data;

    await this.transporter.sendMail({
      from: `"${this.fromName}" <${this.fromEmail}>`,
      to,
      subject: "Votre code de vérification GovSphere",
      html: `
        <p>Bonjour ${displayName},</p>
        <p>Votre code de vérification à usage unique est :</p>
        <p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#1e40af">${code}</p>
        <p>Ce code expire dans <strong>${expiresMinutes} minutes</strong>.</p>
        <p>Ne partagez ce code avec personne.</p>
        <hr/>
        <p style="color:#6b7280;font-size:12px">GovSphere — Plateforme du Gouvernement de la RDC</p>
      `,
    });
  }

  // ── Lifecycle hooks ────────────────────────────────────────────────────────

  @OnQueueActive()
  onActive(job: Job): void {
    this.logger.debug(`Processing email job #${job.id} — ${job.name}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job): void {
    this.logger.log(`Email job #${job.id} (${job.name}) completed`);
  }

  @OnQueueFailed()
  onFailed(job: Job, err: Error): void {
    this.logger.error(`Email job #${job.id} (${job.name}) failed: ${err.message}`, err.stack);
  }
}
