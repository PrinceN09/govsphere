import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(10_000)
  content!: string;

  @IsOptional()
  @IsString()
  replyToId?: string;

  @IsOptional()
  @IsString()
  type?: string;
}

export class EditMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(10_000)
  content!: string;
}

export class AddReactionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  emoji!: string;
}

export class MessageCursorQueryDto {
  /** Cursor = base64(createdAt:id) of the last message seen — omit for latest */
  @IsOptional()
  @IsString()
  before?: string;

  @IsOptional()
  @IsString()
  after?: string;

  @IsOptional()
  limit?: number;
}

export class MessageSearchDto {
  @IsString()
  @MinLength(2)
  q!: string;

  @IsOptional()
  @IsString()
  channelId?: string;

  @IsOptional()
  limit?: number;
}
