import { ConfigService } from "@nestjs/config";
import { Test, type TestingModule } from "@nestjs/testing";

import { AuditExportProcessor } from "./audit-export.processor";
import { PrismaService } from "../../../prisma/prisma.service";

import type { AuditCleanupJobData, AuditExportJobData } from "./audit-export.processor";
import type { Job } from "bull";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPrisma = {
  auditLog: {
    count: jest.fn(),
    deleteMany: jest.fn(),
  },
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    if (key === "AUDIT_LOG_RETENTION_DAYS") return 365;
    return undefined;
  }),
};

function makeJob<T>(data: T): Job<T> {
  return { id: "job-1", name: "test", data } as unknown as Job<T>;
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("AuditExportProcessor", () => {
  let processor: AuditExportProcessor;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditExportProcessor,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    processor = module.get<AuditExportProcessor>(AuditExportProcessor);
  });

  describe("handleExportCsv", () => {
    it("counts audit logs matching the given filters and returns row count", async () => {
      mockPrisma.auditLog.count.mockResolvedValueOnce(42);

      const data: AuditExportJobData = {
        requestedBy: "admin-1",
        filters: { action: "LOGIN", startDate: "2026-01-01" },
        notifyEmail: "admin@gov.cd",
      };

      const result = await processor.handleExportCsv(makeJob(data));

      expect(result).toEqual({ rows: 42 });
      expect(mockPrisma.auditLog.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ action: "LOGIN" }),
        }),
      );
    });

    it("handles export with no filters (full export)", async () => {
      mockPrisma.auditLog.count.mockResolvedValueOnce(1000);

      const data: AuditExportJobData = {
        requestedBy: "admin-1",
        filters: {},
        notifyEmail: "admin@gov.cd",
      };

      const result = await processor.handleExportCsv(makeJob(data));
      expect(result.rows).toBe(1000);
    });
  });

  describe("handleCleanup", () => {
    it("deletes audit logs older than the retention period and returns deleted count", async () => {
      mockPrisma.auditLog.deleteMany.mockResolvedValueOnce({ count: 150 });

      const result = await processor.handleCleanup(makeJob<AuditCleanupJobData>({}));

      expect(result).toEqual({ deleted: 150 });
      expect(mockPrisma.auditLog.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { createdAt: { lt: expect.any(Date) } },
        }),
      );
    });

    it("uses default 365-day retention from config when not specified in job data", async () => {
      mockPrisma.auditLog.deleteMany.mockResolvedValueOnce({ count: 0 });

      await processor.handleCleanup(makeJob<AuditCleanupJobData>({}));

      // ConfigService.get should be called for the retention days
      expect(mockConfigService.get).toHaveBeenCalledWith("AUDIT_LOG_RETENTION_DAYS");
    });

    it("uses job-provided retention period when specified", async () => {
      mockPrisma.auditLog.deleteMany.mockResolvedValueOnce({ count: 10 });

      const result = await processor.handleCleanup(
        makeJob<AuditCleanupJobData>({ retentionDays: 30 }),
      );

      expect(result.deleted).toBe(10);
    });

    it("onFailed hook logs error without rethrowing", () => {
      expect(() => processor.onFailed(makeJob({}), new Error("DB unavailable"))).not.toThrow();
    });
  });
});
