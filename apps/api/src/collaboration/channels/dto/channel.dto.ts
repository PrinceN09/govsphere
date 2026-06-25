import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

import type { ChannelType } from "@prisma/client";

export class CreateChannelDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  type?: ChannelType;

  // Org scope — exactly one should be set
  @IsOptional()
  @IsString()
  ministryId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  divisionId?: string;

  @IsOptional()
  @IsString()
  provinceId?: string;
}

export class UpdateChannelDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class AddMemberDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @IsBoolean()
  isAdmin?: boolean;
}

export class ChannelQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  type?: ChannelType;

  @IsOptional()
  @IsString()
  ministryId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  divisionId?: string;

  @IsOptional()
  @IsString()
  provinceId?: string;

  @IsOptional()
  @IsString()
  cursor?: string; // last channel id for keyset pagination

  @IsOptional()
  limit?: number;
}
