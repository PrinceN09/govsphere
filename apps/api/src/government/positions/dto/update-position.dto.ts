import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from "class-validator";

import { PositionLevel } from "./create-position.dto";

export class UpdatePositionDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsObject()
  titleTranslations?: Record<string, string>;

  @IsOptional()
  @IsEnum(PositionLevel)
  level?: PositionLevel;

  @IsOptional()
  @IsInt()
  @IsPositive()
  headcount?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
