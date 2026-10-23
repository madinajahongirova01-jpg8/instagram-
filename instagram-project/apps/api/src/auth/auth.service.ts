import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  NotImplementedException,
  UnauthorizedException,
} from '@nestjs/common';
import type { CurrentUser } from '@insta/shared';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { MediaUrlService } from '../common/mappers/media-url.service';
import { ClientMeta, IssuedTokens, SessionsService } from '../sessions/sessions.service';
import { PasswordService } from './password.service';
import { VerificationService } from './verification.service';
import { ChangePasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from './dto/auth.dto';

export const MAX_FAILED_LOGINS = 5;
export const LOCK_DURATION_MS = 15 * 60 * 1000;

export interface AuthResult {
  tokens: IssuedTokens;
  user: CurrentUser;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionsService,
    private readonly verification: VerificationService,
    private readonly mail: MailService,
    private readonly urls: MediaUrlService,
  ) {}

  async register(dto: RegisterDto, meta: ClientMeta): Promise<AuthResult> {
    const taken = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
      select: { email: true },
    });
    if (taken) {
      throw new ConflictException(
        taken.email === dto.email ? 'Email is already registered' : 'Username is already taken',
      );
    }
    const passwordHash = await this.passwords.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        passwordHash,
        profile: { create: { fullName: dto.fullName } },
        privacySettings: { create: {} },
        notificationSettings: { create: {} },
      },
      select: { id: true, email: true },
    });
    const token = await this.verification.create(user.id, 'EMAIL_VERIFICATION', user.email);
    await this.mail.sendEmailVerification(user.email, token);
    this.logger.log({ userId: user.id }, 'User registered');
    const tokens = await this.sessions.createSession(user.id, meta);
    return { tokens, user: await this.currentUser(user.id) };
  }

  async login(dto: LoginDto, meta: ClientMeta): Promise<AuthResult> {
    const user = await this.prisma.user.findFirst({
      where: dto.login.includes('@') ? { email: dto.login } : { username: dto.login },
      select: { id: true, passwordHash: true, failedLoginAttempts: true, lockedUntil: true, twoFactorEnabled: true },
    });
    const now = new Date();
    if (user?.lockedUntil && user.lockedUntil > now) {
      const minutes = Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 60000);
      throw new HttpException(
        `Too many failed login attempts. Try again in ${minutes} minute(s)`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const valid = await this.passwords.verify(dto.password, user?.passwordHash);
    if (!user || !valid) {
      if (user) {
        await this.registerFailedLogin(user.id, user.failedLoginAttempts);
      }
      throw new UnauthorizedException('Invalid login or password');
    }
    if (user.twoFactorEnabled) {
      throw new NotImplementedException('Two-factor authentication is not available yet');
    }
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }
    const tokens = await this.sessions.createSession(user.id, meta);
    return { tokens, user: await this.currentUser(user.id) };
  }

  async refresh(rawRefreshToken: string | undefined, meta: ClientMeta): Promise<AuthResult> {
    if (!rawRefreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }
    const tokens = await this.sessions.rotate(rawRefreshToken, meta);
    return { tokens, user: await this.currentUser(tokens.userId) };
  }

  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (rawRefreshToken) {
      await this.sessions.revokeByRefreshToken(rawRefreshToken);
    }
  }

  async verifyEmail(rawToken: string): Promise<void> {
    const token = await this.verification.consume(rawToken, 'EMAIL_VERIFICATION');
    const user = await this.prisma.user.findUnique({ where: { id: token.userId }, select: { email: true } });
    if (!user || user.email !== token.email) {
      throw new BadRequestException('Token is invalid or expired');
    }
    await this.prisma.user.update({ where: { id: token.userId }, data: { emailVerifiedAt: new Date() } });
  }

  async resendVerification(userId: string): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true, emailVerifiedAt: true },
    });
    if (user.emailVerifiedAt) {
      throw new BadRequestException('Email is already verified');
    }
    const token = await this.verification.create(userId, 'EMAIL_VERIFICATION', user.email);
    await this.mail.sendEmailVerification(user.email, token);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
    if (!user) {
      return;
    }
    const token = await this.verification.create(user.id, 'PASSWORD_RESET', user.email);
    await this.mail.sendPasswordReset(user.email, token);
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const token = await this.verification.consume(dto.token, 'PASSWORD_RESET');
    const passwordHash = await this.passwords.hash(dto.newPassword);
    await this.prisma.user.update({
      where: { id: token.userId },
      data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
    });
    await this.sessions.revokeAllExcept(token.userId, null);
    this.logger.log({ userId: token.userId }, 'Password reset, all sessions revoked');
  }

  async changePassword(userId: string, sessionId: string, dto: ChangePasswordDto): Promise<number> {
    await this.assertPassword(userId, dto.currentPassword);
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('New password must differ from the current one');
    }
    const passwordHash = await this.passwords.hash(dto.newPassword);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    const revoked = await this.sessions.revokeAllExcept(userId, sessionId);
    this.logger.log({ userId, revokedSessions: revoked }, 'Password changed');
    return revoked;
  }

  async assertPassword(userId: string, password: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
    const valid = await this.passwords.verify(password, user?.passwordHash);
    if (!user || !valid) {
      throw new BadRequestException('Current password is incorrect');
    }
  }

  async currentUser(userId: string): Promise<CurrentUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, privacySettings: { select: { isPrivate: true } } },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      emailVerified: user.emailVerifiedAt !== null,
      fullName: user.profile?.fullName ?? user.username,
      bio: user.profile?.bio ?? '',
      website: user.profile?.website ?? null,
      avatarUrl: user.profile?.avatarMediaId ? this.urls.sign(user.profile.avatarMediaId) : null,
      isVerified: user.isVerified,
      isPrivate: user.privacySettings?.isPrivate ?? false,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private async registerFailedLogin(userId: string, previousAttempts: number): Promise<void> {
    const attempts = previousAttempts + 1;
    if (attempts >= MAX_FAILED_LOGINS) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { failedLoginAttempts: 0, lockedUntil: new Date(Date.now() + LOCK_DURATION_MS) },
      });
      this.logger.warn({ userId }, 'Account temporarily locked after failed logins');
      return;
    }
    await this.prisma.user.update({ where: { id: userId }, data: { failedLoginAttempts: attempts } });
  }
}
