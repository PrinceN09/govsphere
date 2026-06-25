import { IsDateString, IsOptional, IsString, MaxLength } from "class-validator";

/**
 * Transfer an employee to a different ministry, department, division, office,
 * or manager. All fields are optional — only provided fields are updated.
 * At least one organizational field must change.
 */
export class TransferEmployeeDto {
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
  officeId?: string;

  @IsOptional()
  @IsString()
  managerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  /** ISO-8601 date string. Defaults to now if omitted. */
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;
}
