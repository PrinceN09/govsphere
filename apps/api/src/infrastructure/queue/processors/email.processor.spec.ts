// jest.mock is hoisted before variable declarations — capture the mock fn via module ref
jest.mock("nodemailer", () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: "test-id" }),
  }),
}));

import { ConfigService } from "@nestjs/config";
import { Test, type TestingModule } from "@nestjs/testing";
import * as nodemailer from "nodemailer";

import { EmailProcessor } from "./email.processor";

import type {
  InvitationJobData,
  MfaCodeJobData,
  PasswordResetJobData,
  WelcomeJobData,
} from "./email.processor";
import type { Job } from "bull";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, unknown> = {
      "mail.host": "localhost",
      "mail.port": 1025,
      "mail.secure": false,
      "mail.from.name": "GovSphere Test",
      "mail.from.email": "test@govsphere.gouv.cd",
    };
    return config[key];
  }),
};

function makeJob<T>(data: T): Job<T> {
  return { id: "job-1", name: "test-job", data } as unknown as Job<T>;
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("EmailProcessor", () => {
  let processor: EmailProcessor;
  let mockSendMail: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailProcessor, { provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    processor = module.get<EmailProcessor>(EmailProcessor);

    // Grab the sendMail mock from the mocked nodemailer transport
    const transport = (nodemailer.createTransport as jest.Mock).mock.results[0]?.value as {
      sendMail: jest.Mock;
    };
    mockSendMail = transport.sendMail;
  });

  describe("handlePasswordReset", () => {
    it("sends a password reset email with the correct recipient", async () => {
      const data: PasswordResetJobData = {
        to: "user@gov.cd",
        displayName: "Agent Test",
        resetUrl: "https://app.govsphere.gouv.cd/auth/reset-password?token=abc",
        expiresMinutes: 60,
      };

      await processor.handlePasswordReset(makeJob(data));

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "user@gov.cd",
          subject: expect.stringContaining("Réinitialisation"),
        }),
      );
    });

    it("includes the reset URL in the email body", async () => {
      const data: PasswordResetJobData = {
        to: "user@gov.cd",
        displayName: "Agent",
        resetUrl: "https://app.govsphere.gouv.cd/auth/reset?token=tok123",
        expiresMinutes: 60,
      };

      await processor.handlePasswordReset(makeJob(data));

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ html: expect.stringContaining("tok123") }),
      );
    });
  });

  describe("handleWelcome", () => {
    it("sends a welcome email with the ministry name", async () => {
      const data: WelcomeJobData = {
        to: "newagent@gov.cd",
        displayName: "Nouvel Agent",
        loginUrl: "https://app.govsphere.gouv.cd",
        ministryName: "Ministère des Finances",
      };

      await processor.handleWelcome(makeJob(data));

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "newagent@gov.cd",
          html: expect.stringContaining("Ministère des Finances"),
        }),
      );
    });
  });

  describe("handleInvitation", () => {
    it("sends an invitation email containing the invite URL", async () => {
      const data: InvitationJobData = {
        to: "invite@gov.cd",
        displayName: "Invité",
        inviteUrl: "https://app.govsphere.gouv.cd/accept-invite?token=xyz",
        invitedBy: "Admin RH",
        ministryName: "Ministère du Travail",
        expiresHours: 48,
      };

      await processor.handleInvitation(makeJob(data));

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "invite@gov.cd",
          html: expect.stringContaining("accept-invite"),
        }),
      );
    });
  });

  describe("handleMfaCode", () => {
    it("sends an MFA code email with the OTP code visible", async () => {
      const data: MfaCodeJobData = {
        to: "mfa@gov.cd",
        displayName: "Utilisateur MFA",
        code: "482710",
        expiresMinutes: 5,
      };

      await processor.handleMfaCode(makeJob(data));

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "mfa@gov.cd",
          html: expect.stringContaining("482710"),
        }),
      );
    });
  });

  describe("lifecycle hooks", () => {
    it("onActive logs at debug level without throwing", () => {
      expect(() => processor.onActive(makeJob({}))).not.toThrow();
    });

    it("onCompleted logs without throwing", () => {
      expect(() => processor.onCompleted(makeJob({}))).not.toThrow();
    });

    it("onFailed logs the error without throwing", () => {
      expect(() => processor.onFailed(makeJob({}), new Error("SMTP failed"))).not.toThrow();
    });
  });
});
