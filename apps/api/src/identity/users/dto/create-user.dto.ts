import { SupportedLanguage, UserType } from "@prisma/client";
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

/** Matricule format: 1–4 digits, 1 or 2 dot-separated groups. */
const MATRICULE_REGEX = /^\d{1,4}(\.\d{1,4}){1,2}$/;

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName!: string;

  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsOptional()
  @IsString()
  @Matches(MATRICULE_REGEX, {
    message: "Matricule must be in format: 1.641.558 or 478.432 or 424.55",
  })
  matriculeNumber?: string;

  @IsOptional()
  @IsEnum(UserType)
  userType?: UserType;

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
  positionId?: string;

  @IsOptional()
  @IsString()
  managerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsEnum(SupportedLanguage)
  preferredLanguage?: SupportedLanguage;

  /** Initial password. If not provided, a secure random one is generated. */
  @IsOptional()
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  initialPassword?: string;
}
