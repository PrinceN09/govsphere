/**
 * Prinodia Chat v1.4.0 — Bookmark DTOs
 */

import { IsOptional, IsString, MaxLength } from "class-validator";

export class CreateBookmarkDto {
  @IsOptional()
  @IsString()
  messageId?: string;

  @IsOptional()
  @IsString()
  dmId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
