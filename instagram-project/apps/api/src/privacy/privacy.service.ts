import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Paginated, UserSummary } from '@insta/shared';
import { PrismaService } from '../prisma/prisma.service';
import { DtoMapper, userSummarySelect } from '../common/mappers/dto-mapper.service';
import { PaginationQueryDto, toPage } from '../common/pagination/pagination';
import { PAGE_LIMIT_DEFAULT } from '@insta/shared';
import { PrivacySettings } from '../generated/prisma/client';
import { CreateReportDto, UpdatePrivacySettingsDto } from './dto/privacy.dto';
import { VisibilityService } from './visibility.service';

export type PeopleList = 'closeFriends' | 'storyHidden';

const PEOPLE_LIST_MAX = 500;

@Injectable()
export class PrivacyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: DtoMapper,
    private readonly visibility: VisibilityService,
  ) {}

  async getSettings(userId: string): Promise<PrivacySettings> {
    return this.prisma.privacySettings.upsert({ where: { userId }, update: {}, create: { userId } });
  }

  async updateSettings(userId: string, dto: UpdatePrivacySettingsDto): Promise<PrivacySettings> {
    const before = await this.getSettings(userId);
    const updated = await this.prisma.privacySettings.update({ where: { userId }, data: dto });
    if (before.isPrivate && !updated.isPrivate) {
      await this.acceptAllPending(userId);
    }
    return updated;
  }

  async block(userId: string, targetId: string): Promise<void> {
    if (userId === targetId) {
      throw new BadRequestException('You cannot block yourself');
    }
    const target = await this.prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
    if (!target) {
      throw new NotFoundException('User not found');
    }
    await this.prisma.$transaction([
      this.prisma.block.upsert({
        where: { blockerId_blockedId: { blockerId: userId, blockedId: targetId } },
        update: {},
        create: { blockerId: userId, blockedId: targetId },
      }),
      this.prisma.follow.deleteMany({
        where: {
          OR: [
            { followerId: userId, followingId: targetId },
            { followerId: targetId, followingId: userId },
          ],
        },
      }),
      this.prisma.closeFriend.deleteMany({
        where: {
          OR: [
            { userId, friendId: targetId },
            { userId: targetId, friendId: userId },
          ],
        },
      }),
      this.prisma.followRequest.deleteMany({
        where: {
          OR: [
            { requesterId: userId, targetId },
            { requesterId: targetId, targetId: userId },
          ],
        },
      }),
    ]);
  }

  async unblock(userId: string, targetId: string): Promise<void> {
    await this.prisma.block.deleteMany({ where: { blockerId: userId, blockedId: targetId } });
  }

  async listBlocked(userId: string, query: PaginationQueryDto): Promise<Paginated<UserSummary>> {
    const limit = query.limit ?? PAGE_LIMIT_DEFAULT;
    const rows = await this.prisma.block.findMany({
      where: { blockerId: userId },
      orderBy: [{ createdAt: 'desc' }, { blockedId: 'desc' }],
      take: limit + 1,
      ...(query.cursor
        ? { skip: 1, cursor: { blockerId_blockedId: { blockerId: userId, blockedId: query.cursor } } }
        : {}),
      select: { blocked: { select: userSummarySelect } },
    });
    return toPage(
      rows.map((r) => ({ id: r.blocked.id, user: r.blocked })),
      query,
      (r) => this.mapper.user(r.user),
    );
  }

  async listPeople(userId: string, list: PeopleList): Promise<UserSummary[]> {
    const where = { userId };
    const users =
      list === 'closeFriends'
        ? (
            await this.prisma.closeFriend.findMany({
              where,
              orderBy: { createdAt: 'desc' },
              take: PEOPLE_LIST_MAX,
              select: { friend: { select: userSummarySelect } },
            })
          ).map((r) => r.friend)
        : (
            await this.prisma.storyHide.findMany({
              where,
              orderBy: { createdAt: 'desc' },
              take: PEOPLE_LIST_MAX,
              select: { hidden: { select: userSummarySelect } },
            })
          ).map((r) => r.hidden);
    return users.map((u) => this.mapper.user(u));
  }

  async addPerson(userId: string, targetId: string, list: PeopleList): Promise<void> {
    if (userId === targetId) {
      throw new BadRequestException('You cannot add yourself');
    }
    const target = await this.prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
    if (!target || (await this.visibility.isBlockedEitherWay(userId, targetId))) {
      throw new NotFoundException('User not found');
    }
    if (list === 'closeFriends') {
      await this.prisma.closeFriend.upsert({
        where: { userId_friendId: { userId, friendId: targetId } },
        update: {},
        create: { userId, friendId: targetId },
      });
    } else {
      await this.prisma.storyHide.upsert({
        where: { userId_hiddenUserId: { userId, hiddenUserId: targetId } },
        update: {},
        create: { userId, hiddenUserId: targetId },
      });
    }
  }

  async removePerson(userId: string, targetId: string, list: PeopleList): Promise<void> {
    if (list === 'closeFriends') {
      await this.prisma.closeFriend.deleteMany({ where: { userId, friendId: targetId } });
    } else {
      await this.prisma.storyHide.deleteMany({ where: { userId, hiddenUserId: targetId } });
    }
  }

  async report(userId: string, dto: CreateReportDto): Promise<{ id: string }> {
    const exists = await this.targetExists(dto);
    if (!exists) {
      throw new NotFoundException('Report target not found');
    }
    if (dto.targetType === 'USER' && dto.targetId === userId) {
      throw new BadRequestException('You cannot report yourself');
    }
    const duplicate = await this.prisma.report.findUnique({
      where: {
        reporterId_targetType_targetId: { reporterId: userId, targetType: dto.targetType, targetId: dto.targetId },
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictException('You have already reported this');
    }
    const report = await this.prisma.report.create({
      data: { reporterId: userId, ...dto },
      select: { id: true },
    });
    return report;
  }

  private async targetExists(dto: CreateReportDto): Promise<boolean> {
    const where = { where: { id: dto.targetId }, select: { id: true } } as const;
    switch (dto.targetType) {
      case 'USER':
        return (await this.prisma.user.findUnique(where)) !== null;
      case 'POST':
        return (await this.prisma.post.findUnique(where)) !== null;
      case 'COMMENT':
        return (await this.prisma.comment.findUnique(where)) !== null;
      case 'STORY':
        return (await this.prisma.story.findUnique(where)) !== null;
      case 'REEL':
        return (await this.prisma.reel.findUnique(where)) !== null;
      case 'MESSAGE':
        return (await this.prisma.message.findUnique(where)) !== null;
      default:
        return false;
    }
  }

  private async acceptAllPending(userId: string): Promise<void> {
    const pending = await this.prisma.followRequest.findMany({
      where: { targetId: userId, status: 'PENDING' },
      select: { id: true, requesterId: true },
    });
    if (pending.length === 0) {
      return;
    }
    await this.prisma.$transaction([
      this.prisma.follow.createMany({
        data: pending.map((p) => ({ followerId: p.requesterId, followingId: userId })),
        skipDuplicates: true,
      }),
      this.prisma.followRequest.updateMany({
        where: { id: { in: pending.map((p) => p.id) } },
        data: { status: 'ACCEPTED' },
      }),
    ]);
  }
}
