import { IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

/** End the employee's current primary position and assign them to a new one. */
export class ChangePositionDto {
  @IsString()
  @IsNotEmpty()
  positionId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  /** ISO-8601 date string. Defaults to now if omitted. */
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;
}
