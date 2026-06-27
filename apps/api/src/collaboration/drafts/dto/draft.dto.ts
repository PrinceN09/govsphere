/**
 * Prinodia Chat v1.4.0 — Draft DTOs
 */

import { IsOptional, IsString, MaxLength } from "class-validator";

export class UpsertDraftDto {
  @IsString()
  @MaxLength(40_000)
  content!: string;

  @IsOptional()
  @IsString()
  replyToId?: string;
}
