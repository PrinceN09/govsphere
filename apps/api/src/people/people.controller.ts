/**
 * Prinodia People — PeopleController v1.3.0
 * People directory + profile API: /v1/people
 */

import { Body, Controller, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";

import {
  QueryPeopleDto,
  UpsertEmployeeProfileDto,
  AddSkillDto,
  QuerySkillsDto,
  CreateSkillDto,
} from "./dto/people.dto";
import { PeopleService } from "./people.service";
import { RequirePermissions } from "../common/decorators/permissions.decorator";

@Controller("v1/people")
export class PeopleController {
  constructor(private readonly peopleService: PeopleService) {}

  // ─── People Directory ─────────────────────────────────────────────────────

  /**
   * GET /v1/people
   * Paginated people directory with optional search and filters.
   * ?q=name&organizationId=&orgNodeId=&workloadStatus=&skillId=&page=&limit=
   */
  @Get()
  @RequirePermissions("USER:READ")
  findAll(@Query() query: QueryPeopleDto) {
    return this.peopleService.findAll(query);
  }

  /**
   * GET /v1/people/:userId
   * Full person profile: user + employeeProfile + skills + manager + reports.
   */
  @Get(":userId")
  @RequirePermissions("USER:READ")
  findOne(@Param("userId") userId: string) {
    return this.peopleService.findOne(userId);
  }

  // ─── Employee Profile (extended data) ────────────────────────────────────

  /**
   * GET /v1/people/:userId/profile
   * Get the EmployeeProfile for a user (null if not yet created).
   */
  @Get(":userId/profile")
  @RequirePermissions("USER:READ")
  getProfile(@Param("userId") userId: string) {
    return this.peopleService.getProfile(userId);
  }

  /**
   * PUT /v1/people/:userId/profile
   * Upsert EmployeeProfile for a user.
   * Body must include organizationId for create path.
   */
  @Put(":userId/profile")
  @RequirePermissions("USER:UPDATE")
  upsertProfile(
    @Param("userId") userId: string,
    @Body() dto: UpsertEmployeeProfileDto & { organizationId?: string },
  ) {
    const { organizationId = "", ...profileDto } = dto;
    return this.peopleService.upsertProfile(userId, profileDto, organizationId);
  }

  // ─── Skills ───────────────────────────────────────────────────────────────

  /**
   * POST /v1/people/:userId/skills
   * Add or update a skill on the user's profile (upsert by skillId).
   */
  @Post(":userId/skills")
  @RequirePermissions("USER:UPDATE")
  addSkill(@Param("userId") userId: string, @Body() dto: AddSkillDto) {
    return this.peopleService.addSkill(userId, dto);
  }

  /**
   * DELETE /v1/people/:userId/skills/:skillId
   * Remove a skill from the user's profile.
   */
  @Delete(":userId/skills/:skillId")
  @RequirePermissions("USER:UPDATE")
  removeSkill(@Param("userId") userId: string, @Param("skillId") skillId: string) {
    return this.peopleService.removeSkill(userId, skillId);
  }

  // ─── Workload & Expert Finder ─────────────────────────────────────────────

  /**
   * GET /v1/people/workload/summary?organizationId=
   * Counts of employees per workload status for an org.
   */
  @Get("workload/summary")
  @RequirePermissions("USER:READ")
  workloadSummary(@Query("organizationId") organizationId: string) {
    return this.peopleService.getWorkloadSummary(organizationId);
  }

  /**
   * GET /v1/people/experts?skillId=&orgNodeId=&organizationId=&availability=true
   * Find available experts for a given skill + node.
   */
  @Get("experts/search")
  @RequirePermissions("USER:READ")
  findExperts(
    @Query("skillId") skillId?: string,
    @Query("orgNodeId") orgNodeId?: string,
    @Query("organizationId") organizationId?: string,
    @Query("availability") availability?: string,
    @Query("limit") limit?: string,
  ) {
    return this.peopleService.findExperts({
      ...(skillId !== undefined ? { skillId } : {}),
      ...(orgNodeId !== undefined ? { orgNodeId } : {}),
      ...(organizationId !== undefined ? { organizationId } : {}),
      availability: availability === "true",
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  // ─── Skills catalog ───────────────────────────────────────────────────────

  /**
   * GET /v1/people/skills/catalog?q=&category=&page=&limit=
   * Paginated skill catalog.
   */
  @Get("skills/catalog")
  @RequirePermissions("USER:READ")
  findSkills(@Query() query: QuerySkillsDto) {
    return this.peopleService.findSkills(query);
  }

  /**
   * POST /v1/people/skills/catalog
   * Create a new skill in the catalog.
   */
  @Post("skills/catalog")
  @RequirePermissions("ORGANIZATION:UPDATE")
  createSkill(@Body() dto: CreateSkillDto) {
    return this.peopleService.createSkill(dto);
  }
}
