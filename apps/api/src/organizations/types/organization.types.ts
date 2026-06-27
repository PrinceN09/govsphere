import type { Prisma, OrganizationStatus, OrganizationType } from "@prisma/client";

export type { OrganizationStatus, OrganizationType };

export type OrganizationWithCounts = Prisma.OrganizationGetPayload<{
  include: {
    _count: {
      select: {
        ministries: true;
        departments: true;
        users: true;
      };
    };
    ministries: {
      select: {
        id: true;
        name: true;
        code: true;
        isActive: true;
      };
    };
  };
}>;

export type OrganizationDelegate = PrismaClientLike["organization"];

type PrismaClientLike = {
  organization: {
    findMany: (args?: unknown) => Promise<unknown[]>;
    findUnique: (args?: unknown) => Promise<OrganizationWithCounts | null>;
    create: (args?: unknown) => Promise<unknown>;
    update: (args?: unknown) => Promise<unknown>;
    count: (args?: unknown) => Promise<number>;
  };
};
