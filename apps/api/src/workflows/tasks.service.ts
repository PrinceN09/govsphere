/**
 * Prinodia Workspace — TasksService (v0.8.1)
 *
 * Uses WorkflowDb type shim until `prisma generate` regenerates the client.
 */

import { Injectable, NotFoundException } from "@nestjs/common";

import { AuditService } from "../identity/audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";

import type {
  AddTaskCommentDto,
  CreateTaskDto,
  TaskQueryDto,
  UpdateTaskDto,
} from "./dto/workflow.dto";
import type { WorkflowDb } from "./workflow-db.types";
import type { AuthenticatedUser } from "../common/types/auth.types";
import type { AuditAction } from "@prisma/client";

const TASK_SELECT = {
  id: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  dueAt: true,
  completedAt: true,
  cancelledAt: true,
  tags: true,
  createdAt: true,
  updatedAt: true,
  assignee: { select: { id: true, displayName: true, email: true } },
  createdBy: { select: { id: true, displayName: true } },
  instance: { select: { id: true, title: true } },
  _count: { select: { comments: true, attachments: true } },
};

@Injectable()
export class TasksService {
  private get db(): WorkflowDb {
    return this.prisma as unknown as WorkflowDb;
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateTaskDto, actor: AuthenticatedUser) {
    const task = await this.db.task.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        priority: dto.priority ?? "MEDIUM",
        status: "TODO",
        createdById: actor.id,
        tags: dto.tags ?? [],
        deletedAt: null,
        assigneeId: dto.assigneeId ?? null,
        instanceId: dto.instanceId ?? null,
        documentId: null,
        ...(dto.dueAt !== undefined ? { dueAt: new Date(dto.dueAt) } : {}),
      },
      select: TASK_SELECT,
    });

    void this.audit.log({
      userId: actor.id,
      action: "TASK_ASSIGNED" as AuditAction,
      entityType: "Task",
      entityId: task.id,
      metadata: { title: task.title, assigneeId: dto.assigneeId },
    });

    return task;
  }

  async list(query: TaskQueryDto, _actor: AuthenticatedUser) {
    const take = Math.min(query.limit ?? 25, 100);
    const where: Record<string, unknown> = { deletedAt: null };
    if (query.status) where["status"] = query.status;
    if (query.priority) where["priority"] = query.priority;
    if (query.assigneeId) where["assigneeId"] = query.assigneeId;
    if (query.instanceId) where["instanceId"] = query.instanceId;
    if (query.cursor) {
      where["createdAt"] = { lt: new Date(Buffer.from(query.cursor, "base64url").toString()) };
    }

    const rows = await this.db.task.findMany({
      where,
      take: take + 1,
      orderBy: [{ priority: "desc" }, { dueAt: "asc" }, { createdAt: "desc" }],
      select: TASK_SELECT,
    });

    const hasMore = rows.length > take;
    const items = rows.slice(0, take);
    const last = items[items.length - 1];
    const nextCursor =
      hasMore && last ? Buffer.from(last.createdAt.toISOString()).toString("base64url") : undefined;

    return { items, hasMore, ...(nextCursor !== undefined ? { nextCursor } : {}) };
  }

  async myTasks(actor: AuthenticatedUser) {
    return this.db.task.findMany({
      where: {
        assigneeId: actor.id,
        deletedAt: null,
        status: { notIn: ["DONE", "CANCELLED"] },
      },
      orderBy: [{ priority: "desc" }, { dueAt: "asc" }],
      select: TASK_SELECT,
    });
  }

  async findById(id: string) {
    const task = await this.db.task.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, displayName: true, email: true } },
        createdBy: { select: { id: true, displayName: true } },
        instance: { select: { id: true, title: true } },
        comments: {
          where: { deletedAt: null },
          orderBy: { createdAt: "asc" },
          include: { author: { select: { id: true, displayName: true } } },
        },
        attachments: {
          select: { id: true, filename: true, mimeType: true, sizeBytes: true, createdAt: true },
        },
      },
    });
    if (!task) throw new NotFoundException("Task not found");
    return task;
  }

  async update(id: string, dto: UpdateTaskDto, actor: AuthenticatedUser) {
    await this.findById(id);

    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data["title"] = dto.title;
    if (dto.description !== undefined) data["description"] = dto.description;
    if (dto.status !== undefined) {
      data["status"] = dto.status;
      if (dto.status === "DONE") data["completedAt"] = new Date();
      if (dto.status === "CANCELLED") data["cancelledAt"] = new Date();
    }
    if (dto.priority !== undefined) data["priority"] = dto.priority;
    if (dto.assigneeId !== undefined) data["assignee"] = { connect: { id: dto.assigneeId } };
    if (dto.dueAt !== undefined) data["dueAt"] = new Date(dto.dueAt);
    if (dto.tags !== undefined) data["tags"] = dto.tags;

    const updated = await this.db.task.update({
      where: { id },
      data,
      select: TASK_SELECT,
    });

    void this.audit.log({
      userId: actor.id,
      action: "TASK_UPDATED" as AuditAction,
      entityType: "Task",
      entityId: id,
      metadata: { changes: Object.keys(dto) },
    });

    return updated;
  }

  async delete(id: string, actor: AuthenticatedUser) {
    await this.findById(id);
    await this.db.task.update({ where: { id }, data: { deletedAt: new Date() } });

    void this.audit.log({
      userId: actor.id,
      action: "TASK_DELETED" as AuditAction,
      entityType: "Task",
      entityId: id,
    });

    return { deleted: true };
  }

  async addComment(taskId: string, dto: AddTaskCommentDto, actor: AuthenticatedUser) {
    await this.findById(taskId);
    const comment = await this.db.taskComment.create({
      data: {
        taskId,
        authorId: actor.id,
        content: dto.content,
        deletedAt: null,
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        author: { select: { id: true, displayName: true } },
      },
    });

    void this.audit.log({
      userId: actor.id,
      action: "TASK_COMMENT_ADDED" as AuditAction,
      entityType: "Task",
      entityId: taskId,
    });

    return comment;
  }

  async listComments(taskId: string) {
    await this.findById(taskId);
    return this.db.taskComment.findMany({
      where: { taskId, deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        content: true,
        createdAt: true,
        author: { select: { id: true, displayName: true } },
      },
    });
  }
}
