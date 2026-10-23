import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { CookieOptions, Request, Response } from 'express';
import type { AuthResponse, CurrentUser as CurrentUserDto, MessageResponse } from '@insta/shared';
import { Public } from '../common/decorators/public.decorator';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import type { ClientMeta, IssuedTokens } from '../sessions/sessions.service';
import { AuthResult, AuthService } from './auth.service';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  TokenDto,
} from './dto/auth.dto';

export const REFRESH_COOKIE = 'rt';
const REFRESH_COOKIE_PATH = '/api/auth';
const STRICT_LIMIT = { default: { limit: 10, ttl: 60_000 } };

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly cookieSecure: boolean;

  constructor(
    private readonly auth: AuthService,
    config: ConfigService,
  ) {
    this.cookieSecure = config.get<boolean>('COOKIE_SECURE') === true;
  }

  @Public()
  @Throttle(STRICT_LIMIT)
  @Post('register')
  @ApiOperation({ summary: 'Регистрация. Возвращает access token, refresh token ставится в httpOnly cookie' })
  async register(@Body() dto: RegisterDto, @Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<AuthResponse> {
    return this.respond(await this.auth.register(dto, meta(req)), res);
  }

  @Public()
  @Throttle(STRICT_LIMIT)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Вход по email или username' })
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<AuthResponse> {
    return this.respond(await this.auth.login(dto, meta(req)), res);
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth(REFRESH_COOKIE)
  @ApiOperation({ summary: 'Ротация refresh token: старый становится недействительным, выдаётся новая пара' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<AuthResponse> {
    try {
      return this.respond(await this.auth.refresh(readRefreshCookie(req), meta(req)), res);
    } catch (error) {
      this.clearCookie(res);
      throw error;
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth(REFRESH_COOKIE)
  @ApiOperation({ summary: 'Выход: сессия отзывается, cookie удаляется' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.auth.logout(readRefreshCookie(req));
    this.clearCookie(res);
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Текущий пользователь' })
  me(@CurrentUser() user: AuthUser): Promise<CurrentUserDto> {
    return this.auth.currentUser(user.id);
  }

  @Public()
  @Throttle(STRICT_LIMIT)
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: TokenDto): Promise<MessageResponse> {
    await this.auth.verifyEmail(dto.token);
    return { message: 'Email verified' };
  }

  @ApiBearerAuth()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@CurrentUser() user: AuthUser): Promise<MessageResponse> {
    await this.auth.resendVerification(user.id);
    return { message: 'Verification email sent' };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Запрос ссылки для сброса пароля. Ответ одинаковый, даже если email не найден' })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<MessageResponse> {
    await this.auth.forgotPassword(dto.email);
    return { message: 'If this email is registered, a reset link has been sent' };
  }

  @Public()
  @Throttle(STRICT_LIMIT)
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Новый пароль по токену из письма. Все сессии завершаются' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<MessageResponse> {
    await this.auth.resetPassword(dto);
    return { message: 'Password has been reset' };
  }

  @ApiBearerAuth()
  @Throttle(STRICT_LIMIT)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Смена пароля. Остальные сессии завершаются' })
  async changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto): Promise<MessageResponse & { revokedSessions: number }> {
    const revokedSessions = await this.auth.changePassword(user.id, user.sessionId, dto);
    return { message: 'Password changed', revokedSessions };
  }

  private respond(result: AuthResult, res: Response): AuthResponse {
    this.setCookie(res, result.tokens);
    return { accessToken: result.tokens.accessToken, expiresIn: result.tokens.expiresIn, user: result.user };
  }

  private cookieOptions(): CookieOptions {
    return { httpOnly: true, secure: this.cookieSecure, sameSite: 'strict', path: REFRESH_COOKIE_PATH };
  }

  private setCookie(res: Response, tokens: IssuedTokens): void {
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, { ...this.cookieOptions(), expires: tokens.refreshExpiresAt });
  }

  private clearCookie(res: Response): void {
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions());
  }
}

function readRefreshCookie(req: Request): string | undefined {
  const cookies = req.cookies as Record<string, string | undefined> | undefined;
  const value = cookies?.[REFRESH_COOKIE];
  return typeof value === 'string' && value.length > 0 && value.length < 200 ? value : undefined;
}

export function meta(req: Request): ClientMeta {
  return { userAgent: req.headers['user-agent'] ?? null, ip: req.ip ?? null };
}
