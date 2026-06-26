/**
 * Prinodia Workspace — Email Queue Service
 *
 * Injectable service that enqueues email jobs.
 * Import this wherever you need to send an email — never call nodemailer directly
 * outside of EmailProcessor.
 *
 * Usage:
 *   constructor(private readonly emailQueue: EmailQueueService) {}
 *
 *   await this.emailQueue.sendPasswordReset({ to, displayName, resetUrl, expiresMinutes: 60 });
 */

import { InjectQueue } from "@nestjs/bull";
import { Injectable, Logger } from "@nestjs/common";

import { EMAIL_JOBS, QUEUES } from "../queues";

import type {
  InvitationJobData,
  MfaCodeJobData,
  PasswordResetJobData,
  WelcomeJobData,
} from "../processors/email.processor";
import type { Queue } from "bull";

/** Bull job options applied to all email jobs. */
const EMAIL_JOB_OPTS = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 5000 },
  removeOnComplete: true,
  removeOnFail: false, // keep failed jobs for inspection
};

@Injectable()
export class EmailQueueService {
  private readonly logger = new Logger(EmailQueueService.name);

  constructor(@InjectQueue(QUEUES.EMAIL) private readonly queue: Queue) {}

  async sendPasswordReset(data: PasswordResetJobData): Promise<void> {
    await this.queue.add(EMAIL_JOBS.PASSWORD_RESET, data, EMAIL_JOB_OPTS);
    this.logger.debug(`Queued password-reset email for ${data.to}`);
  }

  async sendWelcome(data: WelcomeJobData): Promise<void> {
    await this.queue.add(EMAIL_JOBS.WELCOME, data, EMAIL_JOB_OPTS);
    this.logger.debug(`Queued welcome email for ${data.to}`);
  }

  async sendInvitation(data: InvitationJobData): Promise<void> {
    await this.queue.add(EMAIL_JOBS.INVITATION, data, EMAIL_JOB_OPTS);
    this.logger.debug(`Queued invitation email for ${data.to}`);
  }

  async sendMfaCode(data: MfaCodeJobData): Promise<void> {
    await this.queue.add(EMAIL_JOBS.MFA_CODE, data, {
      ...EMAIL_JOB_OPTS,
      attempts: 2,
    });
    this.logger.debug(`Queued MFA code email for ${data.to}`);
  }
}
