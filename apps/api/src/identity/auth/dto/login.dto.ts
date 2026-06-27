import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class LoginDto {
  /**
   * Universal login identifier: email, username, employee ID, or matricule number.
   * Primary field for v1.1.1+.
   *
   * Backward-compat aliases (resolved in auth service if this is absent):
   *   - `credential` — legacy field (existing clients / NextAuth)
   *   - `matricule`  — legacy field (old government clients)
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  identifier?: string;

  /**
   * @deprecated Use `identifier`.
   * Accepted for backward compatibility with existing NextAuth and mobile clients.
   */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  credential?: string;

  /**
   * @deprecated Use `identifier`.
   * Accepted for backward compatibility with old government-only clients.
   */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  matricule?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(128)
  password!: string;

  /** Optional: browser/device fingerprint for device tracking. */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  deviceFingerprint?: string;
}
