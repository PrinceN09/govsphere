import { IsBoolean, IsEnum, IsOptional } from "class-validator";

export enum NotificationFilter {
  ALL = "ALL",
  UNREAD = "UNREAD",
  MENTIONS = "MENTIONS",
}

export class NotificationQueryDto {
  @IsOptional()
  @IsEnum(NotificationFilter)
  filter?: NotificationFilter;

  @IsOptional()
  cursor?: string;

  @IsOptional()
  limit?: number;
}

export class UpdateNotificationDto {
  @IsBoolean()
  isRead!: boolean;
}
