import { ForbiddenException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { SessionDto } from '@insta/shared';
import { PrismaService } from '../prisma/prisma.service';
import { generateToken, sha256 } from '../common/utils/crypto';
import type { AuthUser } from '../common/decorators/current-user.decorator';

export interface ClientMeta {
  userAgent?: string | null;
  ip?: string | null;
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresAt: Date;
  userId: string;
  sessionId: string;
}

interface AccessPayload {
  sub: string;
  sid: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);
  private readonly accessTtl: number;
  private readonly refreshTtlMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.accessTtl = Number(config.getOrThrow('JWT_ACCESS_TTL_SECONDS'));
    this.refreshTtlMs = Number(config.getOrThrow('REFRESH_TOKEN_TTL_DAYS')) * DAY_MS;
  }

  async createSession(userId: string, meta: ClientMeta): Promise<IssuedTokens> {
    const expiresAt = new Date(Date.now() + this.refreshTtlMs);
    const session = await this.prisma.session.create({
      data: {
        userId,
        userAgent: meta.userAgent?.slice(0, 255) ?? null,
        ip: meta.ip ?? null,
        expiresAt,
      },
    });
    const refreshToken = generateToken();
    await this.prisma.refreshToken.create({
      data: { sessionId: session.id, tokenHash: sha256(refreshToken), expiresAt },
    });
    return this.issue(userId, session.id, refreshToken, expiresAt);
  }

  async rotate(rawRefreshToken: string, meta: ClientMeta): Promise<IssuedTokens> {
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(rawRefreshToken) },
      include: { session: true },
    });
    if (!existing) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (existing.usedAt || existing.revokedAt) {
      await this.revokeSessionInternal(existing.sessionId);
      this.logger.warn({ sessionId: existing.sessionId }, 'Refresh token reuse detected, session revoked');
      throw new UnauthorizedException('Refresh token reuse detected');
    }
    const now = new Date();
    if (existing.expiresAt <= now || existing.session.revokedAt || existing.session.expiresAt <= now) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const nextToken = generateToken();
    const expiresAt = new Date(now.getTime() + this.refreshTtlMs);

    const rotated = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.refreshToken.updateMany({
        where: { id: existing.id, usedAt: null, revokedAt: null },
        data: { usedAt: now },
      });
      if (claimed.count !== 1) {
        return null;
      }
      const created = await tx.refreshToken.create({
        data: { sessionId: existing.sessionId, tokenHash: sha256(nextToken), expiresAt },
      });
      await tx.refreshToken.update({ where: { id: existing.id }, data: { replacedById: created.id } });
      await tx.session.update({
        where: { id: existing.sessionId },
        data: {
          lastUsedAt: now,
          expiresAt,
          userAgent: meta.userAgent?.slice(0, 255) ?? existing.session.userAgent,
          ip: meta.ip ?? existing.session.ip,
        },
      });
      return created;
    });

    if (!rotated) {
      await this.revokeSessionInternal(existing.sessionId);
      this.logger.warn({ sessionId: existing.sessionId }, 'Concurrent refresh token reuse detected, session revoked');
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    return this.issue(existing.session.userId, existing.sessionId, nextToken, expiresAt);
  }

  async revokeByRefreshToken(rawRefreshToken: string): Promise<void> {
    const token = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(rawRefreshToken) },
      select: { sessionId: true },
    });
    if (token) {
      await this.revokeSessionInternal(token.sessionId);
    }
  }

  async verifyAccessToken(token: string): Promise<AuthUser> {
    let payload: AccessPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }
    const session = await this.prisma.session.findUnique({
      where: { id: payload.sid },
      select: { userId: true, revokedAt: true, expiresAt: true },
    });
    if (!session || session.userId !== payload.sub || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Session is no longer active');
    }
    return { id: payload.sub, sessionId: payload.sid };
  }

  async list(userId: string, currentSessionId: string): Promise<SessionDto[]> {
    const sessions = await this.prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: 'desc' },
    });
    return sessions.map((s) => ({
      id: s.id,
      userAgent: s.userAgent,
      ip: s.ip,
      createdAt: s.createdAt.toISOString(),
      lastUsedAt: s.lastUsedAt.toISOString(),
      current: s.id === currentSessionId,
    }));
  }

  async revokeOwnSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId }, select: { userId: true } });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    if (session.userId !== userId) {
      throw new ForbiddenException();
    }
    await this.revokeSessionInternal(sessionId);
  }

  async revokeAllExcept(userId: string, keepSessionId: string | null): Promise<number> {
    const now = new Date();
    const sessions = await this.prisma.session.findMany({
      where: { userId, revokedAt: null, ...(keepSessionId ? { id: { not: keepSessionId } } : {}) },
      select: { id: true },
    });
    const ids = sessions.map((s) => s.id);
    if (ids.length === 0) {
      return 0;
    }
    await this.prisma.$transaction([
      this.prisma.session.updateMany({ where: { id: { in: ids } }, data: { revokedAt: now } }),
      this.prisma.refreshToken.updateMany({ where: { sessionId: { in: ids }, revokedAt: null }, data: { revokedAt: now } }),
    ]);
    return ids.length;
  }

  private async revokeSessionInternal(sessionId: string): Promise<void> {
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.session.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: now } }),
      this.prisma.refreshToken.updateMany({ where: { sessionId, revokedAt: null }, data: { revokedAt: now } }),
    ]);
  }

  private async issue(userId: string, sessionId: string, refreshToken: string, refreshExpiresAt: Date): Promise<IssuedTokens> {
    const accessToken = await this.jwt.signAsync({ sub: userId, sid: sessionId } satisfies AccessPayload, {
      expiresIn: this.accessTtl,
    });
    return { accessToken, refreshToken, expiresIn: this.accessTtl, refreshExpiresAt, userId, sessionId };
  }
}
