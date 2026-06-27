import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";

import { AuthService } from "./auth.service";
import { AcceptInvitationDto } from "./dto/accept-invitation.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { LoginDto } from "./dto/login.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { SignupDto } from "./dto/signup.dto";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsersService } from "../users/users.service";

import type { AuthenticatedUser } from "../../common/types/auth.types";
import type { Request, Response } from "express";

const REFRESH_COOKIE = "govsphere_refresh";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env["NODE_ENV"] === "production",
  sameSite: "strict" as const,
  path: "/v1/auth/refresh",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

@Controller("v1/auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  // ---------------------------------------------------------------------------
  // POST /v1/auth/login
  // ---------------------------------------------------------------------------

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<unknown> {
    const ipAddress = this.getIpAddress(req);
    const userAgent = req.headers["user-agent"] ?? "unknown";

    const result = await this.authService.login(dto, ipAddress, userAgent);

    if (result.mfaRequired) {
      return res.status(HttpStatus.ACCEPTED).json(result);
    }

    // Set refresh token as HttpOnly cookie
    res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS);

    return {
      accessToken: result.accessToken,
      user: result.user,
      sessionId: result.sessionId,
    };
  }

  // ---------------------------------------------------------------------------
  // POST /v1/auth/refresh
  // ---------------------------------------------------------------------------

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const refreshToken = req.cookies[REFRESH_COOKIE] as string | undefined;

    if (!refreshToken) {
      res.clearCookie(REFRESH_COOKIE, { path: "/v1/auth/refresh" });
      return res.status(HttpStatus.UNAUTHORIZED).json({
        error: "TOKEN_MISSING",
        message: "No refresh token provided",
      }) as unknown as { accessToken: string };
    }

    const ipAddress = this.getIpAddress(req);
    const userAgent = req.headers["user-agent"] ?? "unknown";

    const tokens = await this.authService.refreshTokens(refreshToken, ipAddress, userAgent);

    // Rotate cookie
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, COOKIE_OPTIONS);

    return { accessToken: tokens.accessToken };
  }

  // ---------------------------------------------------------------------------
  // POST /v1/auth/logout
  // ---------------------------------------------------------------------------

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    // Extract JTI from the raw Authorization header token for blacklisting
    const token = req.headers["authorization"]?.replace("Bearer ", "") ?? "";
    const parts = token.split(".");
    let jti = "";
    if (parts.length === 3 && parts[1]) {
      try {
        const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString()) as {
          jti?: string;
        };
        jti = payload.jti ?? "";
      } catch {
        /* ignore */
      }
    }

    await this.authService.logout(user.id, user.sessionId, jti);
    res.clearCookie(REFRESH_COOKIE, { path: "/v1/auth/refresh" });

    return { message: "Logged out successfully" };
  }

  // ---------------------------------------------------------------------------
  // POST /v1/auth/logout-all
  // ---------------------------------------------------------------------------

  @UseGuards(JwtAuthGuard)
  @Post("logout-all")
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string; revokedSessions: number }> {
    const count = await this.authService.logoutAll(user.id);
    res.clearCookie(REFRESH_COOKIE, { path: "/v1/auth/refresh" });

    return {
      message: `Logged out from all devices`,
      revokedSessions: count,
    };
  }

  // ---------------------------------------------------------------------------
  // POST /v1/auth/forgot-password
  // ---------------------------------------------------------------------------

  @Public()
  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string }> {
    await this.authService.forgotPassword(dto);
    return {
      message: "If an account exists with that credential, a reset link has been sent.",
    };
  }

  // ---------------------------------------------------------------------------
  // POST /v1/auth/reset-password
  // ---------------------------------------------------------------------------

  @Public()
  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    await this.authService.resetPassword(dto, this.getIpAddress(req));
    return { message: "Password reset successful. Please log in." };
  }

  // ---------------------------------------------------------------------------
  // GET /v1/auth/me
  // ---------------------------------------------------------------------------

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async getMe(@CurrentUser() user: AuthenticatedUser): Promise<unknown> {
    return this.usersService.getProfile(user.id);
  }

  // ---------------------------------------------------------------------------
  // POST /v1/auth/signup  (public — creates org + admin user)
  // ---------------------------------------------------------------------------

  @Public()
  @Post("signup")
  @HttpCode(HttpStatus.CREATED)
  async signup(
    @Body() dto: SignupDto,
  ): Promise<{ organizationId: string; userId: string; workspaceSlug: string }> {
    return this.authService.signup(dto);
  }

  // ---------------------------------------------------------------------------
  // POST /v1/auth/accept-invitation  (public — set password + activate)
  // ---------------------------------------------------------------------------

  @Public()
  @Post("accept-invitation")
  @HttpCode(HttpStatus.OK)
  async acceptInvitation(
    @Body() dto: AcceptInvitationDto,
  ): Promise<{ message: string; userId: string; email: string }> {
    const result = await this.authService.acceptInvitation(dto);
    return { message: "Account activated. You can now log in.", ...result };
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  private getIpAddress(req: Request): string {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") {
      return forwarded.split(",")[0]?.trim() ?? req.ip ?? "unknown";
    }
    return req.ip ?? "unknown";
  }
}
