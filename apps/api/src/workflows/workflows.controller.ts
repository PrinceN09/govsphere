/**
 * Prinodia Workspace — WorkflowsController (v0.8.1)
 *
 * Base: v1/workflows
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";

import { TasksService } from "./tasks.service";
import { WorkflowsService } from "./workflows.service";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";

import type {
  AddTaskCommentDto,
  AddWorkflowCommentDto,
  ApproveStepDto,
  CancelWorkflowDto,
  CreateTaskDto,
  CreateWorkflowDefinitionDto,
  CreateWorkflowTemplateDto,
  DelegateStepDto,
  EscalateStepDto,
  RejectStepDto,
  RequestChangesDto,
  ReturnStepDto,
  StartWorkflowDto,
  TaskQueryDto,
  UpdateTaskDto,
  UpdateWorkflowDefinitionDto,
  WorkflowQueryDto,
} from "./dto/workflow.dto";
import type { AuthenticatedUser } from "../common/types/auth.types";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("v1/workflows")
export class WorkflowsController {
  constructor(
    private readonly workflows: WorkflowsService,
    private readonly tasks: TasksService,
  ) {}

  // ── Templates ──────────────────────────────────────────────────────────────

  @Get("templates/built-in")
  @RequirePermissions("WORKFLOW:READ")
  listBuiltInTemplates() {
    return this.workflows.listBuiltInTemplates();
  }

  @Get("templates")
  @RequirePermissions("WORKFLOW:READ")
  listTemplates(@CurrentUser() actor: AuthenticatedUser) {
    return this.workflows.listTemplates(actor);
  }

  @Post("templates")
  @RequirePermissions("WORKFLOW:MANAGE_TEMPLATES")
  createTemplate(@Body() dto: CreateWorkflowTemplateDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.workflows.createTemplate(dto, actor);
  }

  @Post("templates/seed")
  @RequirePermissions("WORKFLOW:MANAGE_TEMPLATES")
  seedBuiltInTemplates(@CurrentUser() actor: AuthenticatedUser) {
    return this.workflows.seedBuiltInTemplates(actor.id);
  }

  // ── Definitions ────────────────────────────────────────────────────────────

  @Get("definitions")
  @RequirePermissions("WORKFLOW:READ")
  listDefinitions(@CurrentUser() actor: AuthenticatedUser) {
    return this.workflows.listDefinitions(actor);
  }

  @Post("definitions")
  @RequirePermissions("WORKFLOW:CREATE")
  createDefinition(
    @Body() dto: CreateWorkflowDefinitionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.workflows.createDefinition(dto, actor);
  }

  @Get("definitions/:id")
  @RequirePermissions("WORKFLOW:READ")
  getDefinition(@Param("id") id: string) {
    return this.workflows.findDefinitionById(id);
  }

  @Patch("definitions/:id")
  @RequirePermissions("WORKFLOW:UPDATE")
  updateDefinition(
    @Param("id") id: string,
    @Body() dto: UpdateWorkflowDefinitionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.workflows.updateDefinition(id, dto, actor);
  }

  // ── Instances ──────────────────────────────────────────────────────────────

  @Get()
  @RequirePermissions("WORKFLOW:READ")
  listInstances(@Query() query: WorkflowQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.workflows.listInstances(query, actor);
  }

  @Post("start")
  @RequirePermissions("WORKFLOW:CREATE")
  startWorkflow(@Body() dto: StartWorkflowDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.workflows.startWorkflow(dto, actor);
  }

  @Get("my-approvals")
  @RequirePermissions("WORKFLOW:READ")
  myPendingApprovals(@CurrentUser() actor: AuthenticatedUser) {
    return this.workflows.myPendingApprovals(actor);
  }

  @Get(":id")
  @RequirePermissions("WORKFLOW:READ")
  getInstance(@Param("id") id: string) {
    return this.workflows.findInstanceById(id);
  }

  @Get(":id/history")
  @RequirePermissions("WORKFLOW:READ")
  getHistory(@Param("id") id: string) {
    return this.workflows.getInstanceHistory(id);
  }

  // ── Approval Actions ───────────────────────────────────────────────────────

  @Post(":id/approve")
  @RequirePermissions("WORKFLOW:APPROVE")
  approve(
    @Param("id") id: string,
    @Body() dto: ApproveStepDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.workflows.approve(id, dto, actor);
  }

  @Post(":id/reject")
  @RequirePermissions("WORKFLOW:APPROVE")
  reject(
    @Param("id") id: string,
    @Body() dto: RejectStepDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.workflows.reject(id, dto, actor);
  }

  @Post(":id/request-changes")
  @RequirePermissions("WORKFLOW:APPROVE")
  requestChanges(
    @Param("id") id: string,
    @Body() dto: RequestChangesDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.workflows.requestChanges(id, dto, actor);
  }

  @Post(":id/delegate")
  @RequirePermissions("WORKFLOW:APPROVE")
  delegate(
    @Param("id") id: string,
    @Body() dto: DelegateStepDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.workflows.delegate(id, dto, actor);
  }

  @Post(":id/escalate")
  @RequirePermissions("WORKFLOW:APPROVE")
  escalate(
    @Param("id") id: string,
    @Body() dto: EscalateStepDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.workflows.escalate(id, dto, actor);
  }

  @Post(":id/return")
  @RequirePermissions("WORKFLOW:APPROVE")
  returnToStep(
    @Param("id") id: string,
    @Body() dto: ReturnStepDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.workflows.returnToStep(id, dto, actor);
  }

  @Post(":id/cancel")
  @RequirePermissions("WORKFLOW:CANCEL")
  cancel(
    @Param("id") id: string,
    @Body() dto: CancelWorkflowDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.workflows.cancel(id, dto, actor);
  }

  // ── Comments ───────────────────────────────────────────────────────────────

  @Get(":id/comments")
  @RequirePermissions("WORKFLOW:READ")
  listComments(@Param("id") id: string) {
    return this.workflows.listComments(id);
  }

  @Post(":id/comments")
  @RequirePermissions("WORKFLOW:COMMENT")
  addComment(
    @Param("id") id: string,
    @Body() dto: AddWorkflowCommentDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.workflows.addComment(id, dto, actor);
  }

  // ── Signatures ─────────────────────────────────────────────────────────────

  @Get(":id/signatures")
  @RequirePermissions("WORKFLOW:READ")
  getSignatures(@Param("id") id: string) {
    return this.workflows.getSignatures(id);
  }

  @Delete("signatures/:sigId/revoke")
  @RequirePermissions("WORKFLOW:MANAGE")
  revokeSignature(@Param("sigId") sigId: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.workflows.revokeSignature(sigId, actor);
  }
}

// ─── Standalone signature verification (public) ───────────────────────────────

@Controller("v1/signatures")
export class SignatureVerifyController {
  constructor(private readonly workflows: WorkflowsService) {}

  @Get("verify/:qrToken")
  verify(@Param("qrToken") qrToken: string) {
    return this.workflows.verifySignature(qrToken);
  }
}

// ─── Tasks Controller ─────────────────────────────────────────────────────────

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("v1/tasks")
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get("mine")
  @RequirePermissions("TASK:READ")
  myTasks(@CurrentUser() actor: AuthenticatedUser) {
    return this.tasks.myTasks(actor);
  }

  @Get()
  @RequirePermissions("TASK:READ")
  list(@Query() query: TaskQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.tasks.list(query, actor);
  }

  @Post()
  @RequirePermissions("TASK:CREATE")
  create(@Body() dto: CreateTaskDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.tasks.create(dto, actor);
  }

  @Get(":id")
  @RequirePermissions("TASK:READ")
  findById(@Param("id") id: string) {
    return this.tasks.findById(id);
  }

  @Patch(":id")
  @RequirePermissions("TASK:UPDATE")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.tasks.update(id, dto, actor);
  }

  @Delete(":id")
  @RequirePermissions("TASK:DELETE")
  delete(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.tasks.delete(id, actor);
  }

  @Get(":id/comments")
  @RequirePermissions("TASK:READ")
  listComments(@Param("id") id: string) {
    return this.tasks.listComments(id);
  }

  @Post(":id/comments")
  @RequirePermissions("TASK:COMMENT")
  addComment(
    @Param("id") id: string,
    @Body() dto: AddTaskCommentDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.tasks.addComment(id, dto, actor);
  }
}
