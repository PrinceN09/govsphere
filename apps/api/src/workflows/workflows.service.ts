/**
 * Prinodia Workspace — WorkflowsService (v0.8.1)
 *
 * Full approval engine: start / cancel / approve / reject / request-changes /
 * delegate / escalate / return. Digital signatures, comments, audit events.
 *
 * Uses WorkflowDb type shim until `prisma generate` regenerates the client.
 */

import { InjectQueue } from "@nestjs/bull";
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";

import { BUILT_IN_TEMPLATES } from "./workflow-templates.data";
import { AuditService } from "../identity/audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";

import type {
  AddWorkflowCommentDto,
  ApproveStepDto,
  CancelWorkflowDto,
  CreateWorkflowDefinitionDto,
  CreateWorkflowTemplateDto,
  DelegateStepDto,
  EscalateStepDto,
  RejectStepDto,
  RequestChangesDto,
  ReturnStepDto,
  StartWorkflowDto,
  UpdateWorkflowDefinitionDto,
  WorkflowQueryDto,
} from "./dto/workflow.dto";
import type { WorkflowDb, WorkflowTemplateRecord } from "./workflow-db.types";
import type { AuthenticatedUser } from "../common/types/auth.types";
import type { AuditAction } from "@prisma/client";
import type { Queue } from "bull";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSlug(name: string, suffix: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60)
    .concat("-", suffix.slice(-6));
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class WorkflowsService {
  private readonly logger = new Logger(WorkflowsService.name);
  /** Typed shim — upgrades to full PrismaClient post `prisma generate` */
  private get db(): WorkflowDb {
    return this.prisma as unknown as WorkflowDb;
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @InjectQueue("notification") private readonly notifQueue: Queue,
  ) {}

  // ── Templates ─────────────────────────────────────────────────────────────

  listBuiltInTemplates() {
    return BUILT_IN_TEMPLATES;
  }

  async listTemplates(actor: AuthenticatedUser) {
    return this.db.workflowTemplate.findMany({
      where: {
        isActive: true,
        ...(actor.ministryId
          ? { OR: [{ ministryId: actor.ministryId }, { ministryId: null }] }
          : {}),
      },
      select: {
        id: true,
        name: true,
        description: true,
        slug: true,
        trigger: true,
        stepDefinitions: true,
        isSystem: true,
        createdAt: true,
        ministry: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    });
  }

  async createTemplate(dto: CreateWorkflowTemplateDto, actor: AuthenticatedUser) {
    const slug = toSlug(dto.name, actor.id);
    const templateData: Record<string, unknown> = {
      name: dto.name,
      slug,
      description: dto.description ?? null,
      trigger: dto.trigger ?? "MANUAL",
      stepDefinitions: dto.stepDefinitions as unknown as Record<string, unknown>[],
      isSystem: false,
      isActive: true,
      createdById: actor.id,
      ministryId: dto.ministryId ?? null,
    };
    const template = await this.db.workflowTemplate.create({
      data: templateData as Omit<WorkflowTemplateRecord, "id" | "createdAt" | "updatedAt">,
    });

    void this.audit.log({
      userId: actor.id,
      action: "WORKFLOW_TEMPLATE_CREATED" as AuditAction,
      entityType: "WorkflowTemplate",
      entityId: template.id,
      metadata: { name: template.name },
    });

    return template;
  }

  async seedBuiltInTemplates(actorId: string) {
    let count = 0;
    for (const tpl of BUILT_IN_TEMPLATES) {
      const exists = await this.db.workflowTemplate.findUnique({ where: { slug: tpl.slug } });
      if (!exists) {
        await this.db.workflowTemplate.create({
          data: {
            name: tpl.name,
            slug: tpl.slug,
            description: tpl.description,
            trigger: tpl.trigger,
            stepDefinitions: tpl.stepDefinitions as unknown as Record<string, unknown>[],
            isSystem: true,
            isActive: true,
            createdById: actorId,
            ministryId: null,
          },
        });
        count++;
      }
    }
    return { seeded: count };
  }

  // ── Definitions ───────────────────────────────────────────────────────────

  async createDefinition(dto: CreateWorkflowDefinitionDto, actor: AuthenticatedUser) {
    const def = await this.db.workflowDefinition.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        trigger: dto.trigger ?? "MANUAL",
        isActive: true,
        createdById: actor.id,
        ...(dto.templateId !== undefined ? { templateId: dto.templateId } : {}),
        ...(dto.ministryId !== undefined ? { ministryId: dto.ministryId } : {}),
      },
    });

    await this.db.workflowStep.createMany({
      data: dto.steps.map((s) => ({
        definitionId: def.id,
        order: s.order,
        name: s.name,
        description: s.description ?? null,
        durationHours: s.durationHours ?? null,
        allowDelegate: s.allowDelegate ?? true,
        allowEscalate: s.allowEscalate ?? true,
        requireComment: s.requireComment ?? false,
        requireSign: s.requireSign ?? false,
        assigneeId: s.assigneeId ?? null,
        roleId: s.roleId ?? null,
      })),
    });

    void this.audit.log({
      userId: actor.id,
      action: "WORKFLOW_CREATED" as AuditAction,
      entityType: "WorkflowDefinition",
      entityId: def.id,
      metadata: { title: def.title },
    });

    return this.findDefinitionById(def.id);
  }

  async listDefinitions(actor: AuthenticatedUser) {
    return this.db.workflowDefinition.findMany({
      where: {
        isActive: true,
        ...(actor.ministryId
          ? { OR: [{ ministryId: actor.ministryId }, { ministryId: null }] }
          : {}),
      },
      select: {
        id: true,
        title: true,
        description: true,
        trigger: true,
        isActive: true,
        createdAt: true,
        ministry: { select: { id: true, name: true } },
        _count: { select: { steps: true, instances: true } },
      },
      orderBy: { title: "asc" },
    });
  }

  async findDefinitionById(id: string) {
    const def = await this.db.workflowDefinition.findUnique({
      where: { id },
      include: {
        steps: { orderBy: { order: "asc" } },
        template: { select: { id: true, name: true } },
        createdBy: { select: { id: true, displayName: true } },
        ministry: { select: { id: true, name: true } },
      },
    });
    if (!def) throw new NotFoundException("Workflow definition not found");
    return def;
  }

  async updateDefinition(id: string, dto: UpdateWorkflowDefinitionDto, _actor: AuthenticatedUser) {
    await this.findDefinitionById(id);
    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data["title"] = dto.title;
    if (dto.description !== undefined) data["description"] = dto.description;
    if (dto.isActive !== undefined) data["isActive"] = dto.isActive;
    await this.db.workflowDefinition.update({ where: { id }, data });
    return this.findDefinitionById(id);
  }

  // ── Instances ─────────────────────────────────────────────────────────────

  async startWorkflow(dto: StartWorkflowDto, actor: AuthenticatedUser) {
    const definition = await this.db.workflowDefinition.findUnique({
      where: { id: dto.definitionId },
      include: { steps: { orderBy: { order: "asc" } } },
    });
    if (!definition || !definition.isActive)
      throw new NotFoundException("Workflow definition not found or inactive");
    const steps = definition.steps ?? [];
    if (steps.length === 0) throw new BadRequestException("Workflow has no steps defined");

    const instance = await this.db.$transaction(async (tx) => {
      const inst = await tx.workflowInstance.create({
        data: {
          definitionId: definition.id,
          title: dto.title,
          description: dto.description ?? null,
          status: "ACTIVE",
          currentStep: 0,
          totalSteps: steps.length,
          initiatorId: actor.id,
          startedAt: new Date(),
          metadata: dto.metadata ?? {},
          deletedAt: null,
          cancelledById: null,
          ...(dto.documentId !== undefined ? { documentId: dto.documentId } : {}),
          ...(dto.dueAt !== undefined ? { dueAt: new Date(dto.dueAt) } : {}),
        },
      });

      const firstStep = steps[0];
      if (firstStep) {
        const dueAt = firstStep.durationHours
          ? new Date(Date.now() + firstStep.durationHours * 3_600_000)
          : null;
        const assigneeId = firstStep.assigneeId ?? actor.id;

        await tx.workflowAssignment.create({
          data: {
            instanceId: inst.id,
            stepId: firstStep.id,
            assigneeId,
            stepOrder: firstStep.order,
            status: "IN_PROGRESS",
            ...(dueAt !== null ? { dueAt } : {}),
          },
        });
      }

      await tx.workflowHistory.create({
        data: {
          instanceId: inst.id,
          actorId: actor.id,
          action: "STARTED",
          stepOrder: 0,
          detail: `Workflow démarré par ${actor.email}`,
          metadata: {},
        },
      });

      return inst;
    });

    void this.audit.log({
      userId: actor.id,
      action: "WORKFLOW_STARTED" as AuditAction,
      entityType: "WorkflowInstance",
      entityId: instance.id,
      metadata: { title: instance.title },
    });

    await this.enqueueNotification(instance.id, "WORKFLOW_STARTED", actor.id);
    return this.findInstanceById(instance.id);
  }

  async listInstances(query: WorkflowQueryDto, _actor: AuthenticatedUser) {
    const take = Math.min(query.limit ?? 25, 100);
    const where: Record<string, unknown> = { deletedAt: null };
    if (query.status) where["status"] = query.status;
    if (query.initiatorId) where["initiatorId"] = query.initiatorId;
    if (query.definitionId) where["definitionId"] = query.definitionId;
    if (query.q) where["title"] = { contains: query.q, mode: "insensitive" };
    if (query.cursor)
      where["createdAt"] = { lt: new Date(Buffer.from(query.cursor, "base64url").toString()) };

    const rows = await this.db.workflowInstance.findMany({
      where,
      take: take + 1,
      orderBy: { createdAt: "desc" },
      select: this.instanceSelect(),
    });

    const hasMore = rows.length > take;
    const items = rows.slice(0, take);
    const last = items[items.length - 1];
    const nextCursor =
      hasMore && last ? Buffer.from(last.createdAt.toISOString()).toString("base64url") : undefined;

    return { items, hasMore, ...(nextCursor !== undefined ? { nextCursor } : {}) };
  }

  async findInstanceById(id: string) {
    const inst = await this.db.workflowInstance.findUnique({
      where: { id },
      select: this.instanceSelect(),
    });
    if (!inst) throw new NotFoundException("Workflow instance not found");
    return inst;
  }

  async getInstanceHistory(id: string) {
    await this.findInstanceById(id);
    return this.db.workflowHistory.findMany({
      where: { instanceId: id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        action: true,
        stepOrder: true,
        detail: true,
        metadata: true,
        createdAt: true,
        actor: { select: { id: true, displayName: true, email: true } },
      },
    });
  }

  private instanceSelect() {
    return {
      id: true,
      title: true,
      description: true,
      status: true,
      currentStep: true,
      totalSteps: true,
      startedAt: true,
      completedAt: true,
      cancelledAt: true,
      dueAt: true,
      documentId: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
      definition: { select: { id: true, title: true } },
      initiator: { select: { id: true, displayName: true, email: true } },
      cancelledBy: { select: { id: true, displayName: true } },
      assignments: {
        select: {
          id: true,
          stepOrder: true,
          status: true,
          dueAt: true,
          completedAt: true,
          step: {
            select: { id: true, name: true, order: true, requireSign: true, requireComment: true },
          },
          assignee: { select: { id: true, displayName: true, email: true } },
          approval: {
            select: {
              id: true,
              decision: true,
              comment: true,
              decidedAt: true,
              approver: { select: { id: true, displayName: true } },
              delegatedTo: { select: { id: true, displayName: true } },
            },
          },
        },
        orderBy: { stepOrder: "asc" },
      },
    };
  }

  // ── Approval Engine ───────────────────────────────────────────────────────

  private async currentAssignment(instanceId: string) {
    return this.db.workflowAssignment.findFirst({
      where: { instanceId, status: "IN_PROGRESS" },
      include: {
        step: { include: { definition: { include: { steps: { orderBy: { order: "asc" } } } } } },
        instance: true,
      },
    });
  }

  private async assertCanAct(instanceId: string, actor: AuthenticatedUser) {
    const assignment = await this.currentAssignment(instanceId);
    if (!assignment) throw new BadRequestException("No active step to act on");
    const inst = assignment.instance;
    if (inst.status !== "ACTIVE") throw new BadRequestException("Workflow is not active");
    if (assignment.assigneeId !== actor.id)
      throw new ForbiddenException("You are not the assignee for this step");
    return assignment;
  }

  async approve(instanceId: string, dto: ApproveStepDto, actor: AuthenticatedUser) {
    const assignment = await this.assertCanAct(instanceId, actor);
    const step = assignment.step;
    if (step.requireComment && !dto.comment)
      throw new BadRequestException("A comment is required to approve this step");

    await this.db.$transaction(async (tx) => {
      const approval = await tx.workflowApproval.create({
        data: {
          instanceId,
          assignmentId: assignment.id,
          approverId: actor.id,
          decision: "APPROVED",
          stepOrder: assignment.stepOrder,
          comment: dto.comment ?? null,
          delegatedToId: null,
        },
      });

      if (dto.signDigitally === true || step.requireSign) {
        await tx.digitalSignature.create({
          data: {
            instanceId,
            approvalId: approval.id,
            signerId: actor.id,
            qrToken: `${instanceId.slice(-8)}-${approval.id.slice(-8)}-${Date.now()}`,
            ipAddress: null,
            userAgent: null,
            certificateRef: null,
            revokedAt: null,
            revokedById: null,
          },
        });
      }

      await tx.workflowAssignment.update({
        where: { id: assignment.id },
        data: { status: "APPROVED", completedAt: new Date() },
      });

      const allSteps = step.definition?.steps ?? [];
      const nextStep = allSteps.find((s: { order: number }) => s.order === step.order + 1);

      if (!nextStep) {
        await tx.workflowInstance.update({
          where: { id: instanceId },
          data: { status: "COMPLETED", completedAt: new Date() },
        });
        await tx.workflowHistory.create({
          data: {
            instanceId,
            actorId: actor.id,
            action: "COMPLETED",
            stepOrder: step.order,
            detail: "Workflow complété avec succès",
            metadata: {},
          },
        });
      } else {
        const dueAt = nextStep.durationHours
          ? new Date(Date.now() + nextStep.durationHours * 3_600_000)
          : null;
        await tx.workflowInstance.update({
          where: { id: instanceId },
          data: { currentStep: nextStep.order },
        });
        await tx.workflowAssignment.create({
          data: {
            instanceId,
            stepId: nextStep.id,
            assigneeId: nextStep.assigneeId ?? actor.id,
            stepOrder: nextStep.order,
            status: "IN_PROGRESS",
            ...(dueAt !== null ? { dueAt } : {}),
          },
        });
        await tx.workflowHistory.create({
          data: {
            instanceId,
            actorId: actor.id,
            action: "STEP_APPROVED",
            stepOrder: step.order,
            detail: `Étape "${step.name}" approuvée`,
            metadata: {},
          },
        });
      }
    });

    void this.audit.log({
      userId: actor.id,
      action: "WORKFLOW_STEP_APPROVED" as AuditAction,
      entityType: "WorkflowInstance",
      entityId: instanceId,
      metadata: { step: step.name, stepOrder: assignment.stepOrder },
    });
    await this.enqueueNotification(instanceId, "STEP_APPROVED", actor.id);
    return this.findInstanceById(instanceId);
  }

  async reject(instanceId: string, dto: RejectStepDto, actor: AuthenticatedUser) {
    const assignment = await this.assertCanAct(instanceId, actor);

    await this.db.$transaction(async (tx) => {
      await tx.workflowApproval.create({
        data: {
          instanceId,
          assignmentId: assignment.id,
          approverId: actor.id,
          decision: "REJECTED",
          comment: dto.comment,
          stepOrder: assignment.stepOrder,
          delegatedToId: null,
        },
      });
      await tx.workflowAssignment.update({
        where: { id: assignment.id },
        data: { status: "REJECTED", completedAt: new Date() },
      });
      await tx.workflowInstance.update({ where: { id: instanceId }, data: { status: "REJECTED" } });
      await tx.workflowHistory.create({
        data: {
          instanceId,
          actorId: actor.id,
          action: "REJECTED",
          stepOrder: assignment.stepOrder,
          detail: dto.comment,
          metadata: {},
        },
      });
    });

    void this.audit.log({
      userId: actor.id,
      action: "WORKFLOW_REJECTED" as AuditAction,
      entityType: "WorkflowInstance",
      entityId: instanceId,
      metadata: { step: assignment.step.name, reason: dto.comment },
    });
    await this.enqueueNotification(instanceId, "WORKFLOW_REJECTED", actor.id);
    return this.findInstanceById(instanceId);
  }

  async requestChanges(instanceId: string, dto: RequestChangesDto, actor: AuthenticatedUser) {
    const assignment = await this.assertCanAct(instanceId, actor);
    const allSteps = assignment.step.definition?.steps ?? [];
    const firstStep = allSteps.find((s: { order: number }) => s.order === 0);
    if (!firstStep) throw new BadRequestException("Cannot find first step");

    await this.db.$transaction(async (tx) => {
      await tx.workflowApproval.create({
        data: {
          instanceId,
          assignmentId: assignment.id,
          approverId: actor.id,
          decision: "REQUEST_CHANGES",
          comment: dto.comment,
          stepOrder: assignment.stepOrder,
          delegatedToId: null,
        },
      });
      await tx.workflowAssignment.update({
        where: { id: assignment.id },
        data: { status: "RETURNED", completedAt: new Date() },
      });
      await tx.workflowInstance.update({ where: { id: instanceId }, data: { currentStep: 0 } });
      await tx.workflowAssignment.create({
        data: {
          instanceId,
          stepId: firstStep.id,
          assigneeId: assignment.instance.initiatorId,
          stepOrder: 0,
          status: "IN_PROGRESS",
        },
      });
      await tx.workflowHistory.create({
        data: {
          instanceId,
          actorId: actor.id,
          action: "CHANGES_REQUESTED",
          stepOrder: assignment.stepOrder,
          detail: dto.comment,
          metadata: {},
        },
      });
    });

    void this.audit.log({
      userId: actor.id,
      action: "WORKFLOW_STEP_RETURNED" as AuditAction,
      entityType: "WorkflowInstance",
      entityId: instanceId,
      metadata: { step: assignment.step.name },
    });
    return this.findInstanceById(instanceId);
  }

  async delegate(instanceId: string, dto: DelegateStepDto, actor: AuthenticatedUser) {
    const assignment = await this.assertCanAct(instanceId, actor);
    if (!assignment.step.allowDelegate)
      throw new BadRequestException("Delegation is not allowed for this step");

    const delegatee = await this.db.user.findUnique({ where: { id: dto.delegateTo } });
    if (!delegatee) throw new NotFoundException("Delegate user not found");

    await this.db.$transaction(async (tx) => {
      await tx.workflowApproval.create({
        data: {
          instanceId,
          assignmentId: assignment.id,
          approverId: actor.id,
          decision: "DELEGATED",
          delegatedToId: dto.delegateTo,
          stepOrder: assignment.stepOrder,
          comment: dto.comment ?? null,
        },
      });
      await tx.workflowAssignment.update({
        where: { id: assignment.id },
        data: { status: "DELEGATED", completedAt: new Date() },
      });
      await tx.workflowAssignment.create({
        data: {
          instanceId,
          stepId: assignment.stepId,
          assigneeId: dto.delegateTo,
          stepOrder: assignment.stepOrder,
          status: "IN_PROGRESS",
          ...(assignment.dueAt !== null ? { dueAt: assignment.dueAt } : {}),
        },
      });
      await tx.workflowHistory.create({
        data: {
          instanceId,
          actorId: actor.id,
          action: "DELEGATED",
          stepOrder: assignment.stepOrder,
          detail: `Délégué à ${dto.delegateTo}`,
          metadata: { delegateTo: dto.delegateTo },
        },
      });
    });

    void this.audit.log({
      userId: actor.id,
      action: "WORKFLOW_STEP_DELEGATED" as AuditAction,
      entityType: "WorkflowInstance",
      entityId: instanceId,
      metadata: { step: assignment.step.name, delegateTo: dto.delegateTo },
    });
    return this.findInstanceById(instanceId);
  }

  async escalate(instanceId: string, dto: EscalateStepDto, actor: AuthenticatedUser) {
    const assignment = await this.assertCanAct(instanceId, actor);
    if (!assignment.step.allowEscalate)
      throw new BadRequestException("Escalation is not allowed for this step");
    const allSteps = assignment.step.definition?.steps ?? [];
    const nextStep = allSteps.find((s: { order: number }) => s.order === assignment.step.order + 1);

    await this.db.$transaction(async (tx) => {
      await tx.workflowApproval.create({
        data: {
          instanceId,
          assignmentId: assignment.id,
          approverId: actor.id,
          decision: "ESCALATED",
          stepOrder: assignment.stepOrder,
          comment: dto.comment ?? null,
          delegatedToId: null,
        },
      });
      await tx.workflowAssignment.update({
        where: { id: assignment.id },
        data: { status: "APPROVED", completedAt: new Date() },
      });

      if (nextStep) {
        const dueAt = nextStep.durationHours
          ? new Date(Date.now() + nextStep.durationHours * 3_600_000)
          : null;
        await tx.workflowInstance.update({
          where: { id: instanceId },
          data: { currentStep: nextStep.order },
        });
        await tx.workflowAssignment.create({
          data: {
            instanceId,
            stepId: nextStep.id,
            assigneeId: nextStep.assigneeId ?? actor.id,
            stepOrder: nextStep.order,
            status: "IN_PROGRESS",
            ...(dueAt !== null ? { dueAt } : {}),
          },
        });
      } else {
        await tx.workflowInstance.update({
          where: { id: instanceId },
          data: { status: "COMPLETED", completedAt: new Date() },
        });
      }

      await tx.workflowHistory.create({
        data: {
          instanceId,
          actorId: actor.id,
          action: "ESCALATED",
          stepOrder: assignment.stepOrder,
          detail: dto.comment ?? null,
          metadata: {},
        },
      });
    });

    void this.audit.log({
      userId: actor.id,
      action: "WORKFLOW_STEP_ESCALATED" as AuditAction,
      entityType: "WorkflowInstance",
      entityId: instanceId,
      metadata: { step: assignment.step.name },
    });
    return this.findInstanceById(instanceId);
  }

  async returnToStep(instanceId: string, dto: ReturnStepDto, actor: AuthenticatedUser) {
    const assignment = await this.assertCanAct(instanceId, actor);
    const targetOrder = dto.targetStep ?? Math.max(0, assignment.stepOrder - 1);
    const allSteps = assignment.step.definition?.steps ?? [];
    const targetStep = allSteps.find((s: { order: number }) => s.order === targetOrder);
    if (!targetStep) throw new BadRequestException("Target step not found");

    await this.db.$transaction(async (tx) => {
      await tx.workflowApproval.create({
        data: {
          instanceId,
          assignmentId: assignment.id,
          approverId: actor.id,
          decision: "REQUEST_CHANGES",
          comment: dto.comment,
          stepOrder: assignment.stepOrder,
          delegatedToId: null,
        },
      });
      await tx.workflowAssignment.update({
        where: { id: assignment.id },
        data: { status: "RETURNED", completedAt: new Date() },
      });
      await tx.workflowInstance.update({
        where: { id: instanceId },
        data: { currentStep: targetOrder },
      });
      await tx.workflowAssignment.create({
        data: {
          instanceId,
          stepId: targetStep.id,
          assigneeId: targetStep.assigneeId ?? assignment.instance.initiatorId,
          stepOrder: targetOrder,
          status: "IN_PROGRESS",
        },
      });
      await tx.workflowHistory.create({
        data: {
          instanceId,
          actorId: actor.id,
          action: "RETURNED",
          stepOrder: assignment.stepOrder,
          detail: `Retourné à l'étape ${targetOrder}: ${dto.comment}`,
          metadata: { targetStep: targetOrder },
        },
      });
    });

    void this.audit.log({
      userId: actor.id,
      action: "WORKFLOW_STEP_RETURNED" as AuditAction,
      entityType: "WorkflowInstance",
      entityId: instanceId,
      metadata: { from: assignment.stepOrder, to: targetOrder },
    });
    return this.findInstanceById(instanceId);
  }

  async cancel(instanceId: string, dto: CancelWorkflowDto, actor: AuthenticatedUser) {
    const instance = await this.findInstanceById(instanceId);
    const inst = instance as unknown as { status: string; initiator: { id: string } };
    if (inst.status === "COMPLETED" || inst.status === "CANCELLED") {
      throw new BadRequestException("Cannot cancel a completed or already cancelled workflow");
    }
    if (inst.initiator.id !== actor.id)
      throw new ForbiddenException("Only the initiator can cancel this workflow");

    await this.db.$transaction(async (tx) => {
      await tx.workflowInstance.update({
        where: { id: instanceId },
        data: { status: "CANCELLED", cancelledAt: new Date(), cancelledById: actor.id },
      });
      await tx.workflowAssignment.updateMany({
        where: { instanceId, status: "IN_PROGRESS" },
        data: { status: "SKIPPED", completedAt: new Date() },
      });
      await tx.workflowHistory.create({
        data: {
          instanceId,
          actorId: actor.id,
          action: "CANCELLED",
          detail: dto.reason,
          metadata: {},
        },
      });
    });

    void this.audit.log({
      userId: actor.id,
      action: "WORKFLOW_CANCELLED" as AuditAction,
      entityType: "WorkflowInstance",
      entityId: instanceId,
      metadata: { reason: dto.reason },
    });
    await this.enqueueNotification(instanceId, "WORKFLOW_CANCELLED", actor.id);
    return this.findInstanceById(instanceId);
  }

  // ── Comments ──────────────────────────────────────────────────────────────

  async addComment(instanceId: string, dto: AddWorkflowCommentDto, actor: AuthenticatedUser) {
    await this.findInstanceById(instanceId);
    return this.db.workflowComment.create({
      data: {
        instanceId,
        authorId: actor.id,
        content: dto.content,
        isInternal: dto.isInternal ?? false,
        replyToId: dto.replyToId ?? null,
        deletedAt: null,
      },
      select: {
        id: true,
        content: true,
        isInternal: true,
        createdAt: true,
        replyToId: true,
        author: { select: { id: true, displayName: true } },
      },
    });
  }

  async listComments(instanceId: string) {
    await this.findInstanceById(instanceId);
    return this.db.workflowComment.findMany({
      where: { instanceId, deletedAt: null, replyToId: null },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        content: true,
        isInternal: true,
        createdAt: true,
        author: { select: { id: true, displayName: true } },
        replies: {
          where: { deletedAt: null },
          select: {
            id: true,
            content: true,
            createdAt: true,
            author: { select: { id: true, displayName: true } },
          },
        },
      },
    });
  }

  // ── Signatures ────────────────────────────────────────────────────────────

  async getSignatures(instanceId: string) {
    return this.db.digitalSignature.findMany({
      where: { instanceId, revokedAt: null },
      select: {
        id: true,
        qrToken: true,
        signedAt: true,
        ipAddress: true,
        certificateRef: true,
        signer: { select: { id: true, displayName: true, email: true } },
      },
    });
  }

  async verifySignature(qrToken: string) {
    const sig = await this.db.digitalSignature.findUnique({
      where: { qrToken },
      include: {
        signer: { select: { id: true, displayName: true, email: true } },
        instance: { select: { id: true, title: true, status: true } },
      },
    });
    if (!sig) return { valid: false };
    return {
      valid: sig.revokedAt === null,
      revokedAt: sig.revokedAt,
      signedAt: sig.signedAt,
      signer: (sig as { signer?: unknown }).signer,
      instance: (sig as { instance?: unknown }).instance,
    };
  }

  async revokeSignature(signatureId: string, actor: AuthenticatedUser) {
    const sig = await this.db.digitalSignature.findUnique({ where: { id: signatureId } });
    if (!sig) throw new NotFoundException("Signature not found");
    if (sig.revokedAt) throw new BadRequestException("Signature already revoked");

    const updated = await this.db.digitalSignature.update({
      where: { id: signatureId },
      data: { revokedAt: new Date(), revokedById: actor.id },
    });

    void this.audit.log({
      userId: actor.id,
      action: "DIGITAL_SIGNATURE_REVOKED" as AuditAction,
      entityType: "DigitalSignature",
      entityId: signatureId,
      metadata: { instanceId: sig.instanceId },
    });
    return updated;
  }

  // ── My approvals queue ────────────────────────────────────────────────────

  async myPendingApprovals(actor: AuthenticatedUser) {
    return this.db.workflowAssignment.findMany({
      where: {
        assigneeId: actor.id,
        status: "IN_PROGRESS",
        instance: { status: "ACTIVE", deletedAt: null },
      },
      orderBy: { dueAt: "asc" },
      select: {
        id: true,
        stepOrder: true,
        dueAt: true,
        createdAt: true,
        step: { select: { name: true, requireSign: true, requireComment: true } },
        instance: {
          select: {
            id: true,
            title: true,
            status: true,
            initiator: { select: { id: true, displayName: true } },
          },
        },
      },
    });
  }

  private async enqueueNotification(instanceId: string, event: string, actorId: string) {
    try {
      await this.notifQueue.add(
        "workflow-notification",
        { instanceId, event, actorId },
        { attempts: 3, backoff: { type: "exponential", delay: 1000 } },
      );
    } catch (err) {
      this.logger.warn(`Failed to enqueue workflow notification: ${String(err)}`);
    }
  }
}
