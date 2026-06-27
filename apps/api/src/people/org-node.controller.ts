/**
 * Prinodia People — OrgNodeController v1.3.0
 * Org chart API: /v1/people/org-nodes
 */

import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";

import { CreateOrgNodeDto, UpdateOrgNodeDto, QueryOrgNodesDto } from "./dto/people.dto";
import { OrgNodeService } from "./org-node.service";
import { RequirePermissions } from "../common/decorators/permissions.decorator";

@Controller("v1/people/org-nodes")
export class OrgNodeController {
  constructor(private readonly orgNodeService: OrgNodeService) {}

  /**
   * POST /v1/people/org-nodes
   * Create an org node (root or child).
   */
  @Post()
  @RequirePermissions("ORGANIZATION:UPDATE")
  create(@Body() dto: CreateOrgNodeDto) {
    return this.orgNodeService.create(dto);
  }

  /**
   * GET /v1/people/org-nodes
   * List org nodes — flat list with optional filters.
   */
  @Get()
  @RequirePermissions("ORGANIZATION:READ")
  findAll(@Query() query: QueryOrgNodesDto) {
    return this.orgNodeService.findAll(query);
  }

  /**
   * GET /v1/people/org-nodes/tree?organizationId=&parentId=
   * Lazy-load one level of the tree (children of parentId; omit for roots).
   */
  @Get("tree")
  @RequirePermissions("ORGANIZATION:READ")
  getTree(@Query("organizationId") organizationId: string, @Query("parentId") parentId?: string) {
    return this.orgNodeService.getTree(organizationId, parentId);
  }

  /**
   * GET /v1/people/org-nodes/:id
   * Single node with parent + children snapshot.
   */
  @Get(":id")
  @RequirePermissions("ORGANIZATION:READ")
  findOne(@Param("id") id: string) {
    return this.orgNodeService.findOne(id);
  }

  /**
   * GET /v1/people/org-nodes/:id/ancestors
   * Breadcrumb chain from root → this node.
   */
  @Get(":id/ancestors")
  @RequirePermissions("ORGANIZATION:READ")
  getAncestors(@Param("id") id: string) {
    return this.orgNodeService.getAncestors(id);
  }

  /**
   * PATCH /v1/people/org-nodes/:id
   * Update name, type, sortOrder, parent, active state.
   */
  @Patch(":id")
  @RequirePermissions("ORGANIZATION:UPDATE")
  update(@Param("id") id: string, @Body() dto: UpdateOrgNodeDto) {
    return this.orgNodeService.update(id, dto);
  }

  /**
   * DELETE /v1/people/org-nodes/:id
   * Soft-delete (sets isActive = false).
   */
  @Delete(":id")
  @RequirePermissions("ORGANIZATION:UPDATE")
  remove(@Param("id") id: string) {
    return this.orgNodeService.remove(id);
  }
}
