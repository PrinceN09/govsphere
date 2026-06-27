import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class ForgotPasswordDto {
  /**
   * Universal identifier: email, username, employee ID, or matricule.
   * Replaces the old government-only credential/matricule field.
   * Backward compat: `credential` and `matricule` are also accepted.
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  identifier?: string;

  /** @deprecated Use `identifier`. */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  credential?: string;

  /** @deprecated Use `identifier`. */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  matricule?: string;
}
