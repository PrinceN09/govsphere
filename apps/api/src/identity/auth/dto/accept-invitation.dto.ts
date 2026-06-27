import { IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

export class AcceptInvitationDto {
  /** Raw invitation token from the email link. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  token!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  confirmPassword!: string;
}
