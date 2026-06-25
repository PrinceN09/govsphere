import { IsArray, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateConversationDto {
  /** For GROUP conversations — display name */
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  /** User IDs to include (required; for DIRECT must be exactly 1 other user) */
  @IsArray()
  @IsString({ each: true })
  memberIds!: string[];
}

export class SendDirectMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(10_000)
  content!: string;

  @IsOptional()
  @IsString()
  replyToId?: string;
}

export class DirectMessageCursorDto {
  @IsOptional()
  @IsString()
  before?: string;

  @IsOptional()
  limit?: number;
}
