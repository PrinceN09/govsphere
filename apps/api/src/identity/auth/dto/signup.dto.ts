import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

const ORG_TYPES = [
  "GOVERNMENT",
  "ENTERPRISE",
  "EDUCATION",
  "HEALTHCARE",
  "NGO",
  "CHURCH",
  "NON_PROFIT",
  "OTHER",
] as const;

export class SignupDto {
  // ── Organization fields ────────────────────────────────────────────────────

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  orgName!: string;

  @IsIn(ORG_TYPES)
  orgType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  // ── Admin user fields ──────────────────────────────────────────────────────

  @IsEmail()
  @MaxLength(255)
  workEmail!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  confirmPassword!: string;

  @IsBoolean()
  acceptTerms!: boolean;
}
