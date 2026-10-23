import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { ContactDto, CurrentUser, UserSummary } from '@insta/shared';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { AuthService } from '../auth/auth.service';
import { VerificationService } from '../auth/verification.service';
import { MediaService } from '../media/media.service';
import { DtoMapper, userSummarySelect } from '../common/mappers/dto-mapper.service';
import { VisibilityService } from '../privacy/visibility.service';
import { RealtimeService } from '../realtime/realtime.service';
import { ChangeEmailDto, ChangeUsernameDto } from './dto/users.dto';

const CONTACTS_LIMIT = 20;

import type { PresenceDto } from '@insta/shared';
export type { PresenceDto };

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly verification: VerificationService,
    private readonly mail: MailService,
    private readonly media: MediaService,
    private readonly mapper: DtoMapper,
    private readonly visibility: VisibilityService,
    private readonly realtime: RealtimeService,
  ) {}

  async changeUsername(userId: string, dto: ChangeUsernameDto): Promise<CurrentUser> {
    const current = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { username: true } });
    if (current.username === dto.username) {
      return this.auth.currentUser(userId);
    }
    const taken = await this.prisma.user.findUnique({ where: { username: dto.username }, select: { id: true } });
    if (taken) {
      throw new ConflictException('Username is already taken');
    }
    await this.prisma.user.update({ where: { id: userId }, data: { username: dto.username } });
    return this.auth.currentUser(userId);
  }

  async changeEmail(userId: string, dto: ChangeEmailDto): Promise<CurrentUser> {
    await this.auth.assertPassword(userId, dto.password);
    const current = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
    if (current.email === dto.email) {
      throw new BadRequestException('This is already your email');
    }
    const taken = await this.prisma.user.findUnique({ where: { email: dto.email }, select: { id: true } });
    if (taken) {
      throw new ConflictException('Email is already registered');
    }
    await this.prisma.user.update({ where: { id: userId }, data: { email: dto.email, emailVerifiedAt: null } });
    const token = await this.verification.create(userId, 'EMAIL_VERIFICATION', dto.email);
    await this.mail.sendEmailVerification(dto.email, token);
    await this.mail.sendSecurityNotice(
      current.email,
      'Email вашего аккаунта был изменён. Если это были не вы, восстановите доступ через «Забыли пароль».',
    );
    this.logger.log({ userId }, 'Email changed');
    return this.auth.currentUser(userId);
  }

  async deleteAccount(userId: string, password: string): Promise<void> {
    await this.auth.assertPassword(userId, password);
    const files = await this.prisma.media.findMany({ where: { ownerId: userId }, select: { storageKey: true } });
    await this.prisma.user.delete({ where: { id: userId } });
    await this.media.removeFiles(files.map((f) => f.storageKey));
    this.logger.log({ userId }, 'Account deleted');
  }

  async suggested(userId: string): Promise<UserSummary[]> {
    const users = await this.prisma.user.findMany({
      where: {
        id: { not: userId },
        followers: { none: { followerId: userId } },
        ...this.visibility.notBlockedUserWhere(userId),
      },
      orderBy: [{ followers: { _count: 'desc' } }, { createdAt: 'desc' }],
      take: 10,
      select: userSummarySelect,
    });
    return users.map((u) => this.mapper.user(u));
  }

  async contacts(userId: string): Promise<ContactDto[]> {
    const conversations = await this.prisma.conversation.findMany({
      where: { isGroup: false, participants: { some: { userId } } },
      orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
      take: CONTACTS_LIMIT,
      select: {
        participants: {
          where: { userId: { not: userId }, user: this.visibility.notBlockedUserWhere(userId) },
          select: {
            user: {
              select: { ...userSummarySelect, lastSeenAt: true, privacySettings: { select: { showOnlineStatus: true } } },
            },
          },
        },
      },
    });
    return conversations
      .flatMap((c) => c.participants)
      .map(({ user }) => {
        const visible = user.privacySettings?.showOnlineStatus !== false;
        return {
          ...this.mapper.user(user),
          online: visible && this.realtime.isOnline(user.id),
          lastSeenAt: visible ? (user.lastSeenAt?.toISOString() ?? null) : null,
        };
      });
  }

  async presence(viewerId: string, userId: string): Promise<PresenceDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { lastSeenAt: true, privacySettings: { select: { showOnlineStatus: true } } },
    });
    if (!user || (await this.visibility.isBlockedEitherWay(viewerId, userId))) {
      throw new NotFoundException('User not found');
    }
    if (viewerId !== userId && user.privacySettings?.showOnlineStatus === false) {
      return { online: false, lastSeenAt: null };
    }
    return { online: this.realtime.isOnline(userId), lastSeenAt: user.lastSeenAt?.toISOString() ?? null };
  }
}
