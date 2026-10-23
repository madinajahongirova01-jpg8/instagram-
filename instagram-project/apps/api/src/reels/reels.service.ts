import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { MediaDto, Paginated, UserSummary } from '@insta/shared';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import { NotificationsService } from '../notifications/notifications.service';
import { VisibilityService } from '../privacy/visibility.service';
import { TaggingService } from '../posts/tagging.service';
import { DtoMapper, mediaSelect, userSummarySelect } from '../common/mappers/dto-mapper.service';
import { PaginationQueryDto, pageArgs, toPage } from '../common/pagination/pagination';
import { extractHashtags, preview } from '../common/utils/text';
import { Prisma } from '../generated/prisma/client';
import { CreateReelDto } from './dto/reels.dto';

export function reelInclude(viewerId: string) {
  return {
    author: { select: userSummarySelect },
    video: { select: mediaSelect },
    thumbnail: { select: mediaSelect },
    hashtags: { select: { hashtag: { select: { name: true } } } },
    likes: { where: { userId: viewerId }, select: { id: true }, take: 1 },
    _count: { select: { likes: true, comments: true } },
  } satisfies Prisma.ReelInclude;
}

type ReelRow = Prisma.ReelGetPayload<{ include: ReturnType<typeof reelInclude> }>;

import type { ReelDto } from '@insta/shared';
export type { ReelDto };

export interface VisibleReel {
  id: string;
  authorId: string;
  allowComments: boolean;
}

@Injectable()
export class ReelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
    private readonly notifications: NotificationsService,
    private readonly visibility: VisibilityService,
    private readonly tagging: TaggingService,
    private readonly mapper: DtoMapper,
  ) {}

  async create(userId: string, dto: CreateReelDto): Promise<ReelDto> {
    await this.media.claim(userId, [dto.videoMediaId], 'REEL', ['VIDEO']);
    if (dto.thumbnailMediaId) {
      await this.media.claim(userId, [dto.thumbnailMediaId], 'REEL', ['IMAGE']);
    }
    const caption = dto.caption ?? '';
    const mentionIds = await this.tagging.mentionTargets(userId, caption);
    const reel = await this.prisma.reel.create({
      data: {
        authorId: userId,
        videoMediaId: dto.videoMediaId,
        thumbnailMediaId: dto.thumbnailMediaId ?? null,
        caption,
        durationSec: dto.durationSec ?? null,
        allowComments: dto.allowComments ?? true,
        hashtags: { create: this.tagging.hashtagCreates(extractHashtags(caption)) },
      },
      include: reelInclude(userId),
    });
    await Promise.all(
      mentionIds.map((recipientId) =>
        this.notifications.notify({ recipientId, actorId: userId, type: 'MENTION', entityId: reel.id, preview: preview(caption) }),
      ),
    );
    return this.toDto(reel);
  }

  async feed(viewerId: string, query: PaginationQueryDto): Promise<Paginated<ReelDto>> {
    const rows = await this.prisma.reel.findMany({
      where: {
        OR: [{ authorId: viewerId }, { author: { followers: { some: { followerId: viewerId } } } }],
        author: this.visibility.notBlockedUserWhere(viewerId),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: reelInclude(viewerId),
      ...pageArgs(query),
    });
    return toPage(rows, query, (row) => this.toDto(row));
  }

  async listByUser(viewerId: string, username: string, query: PaginationQueryDto): Promise<Paginated<ReelDto>> {
    const ownerId = await this.visibility.resolveUsername(username);
    await this.visibility.assertCanViewContent(viewerId, ownerId);
    const rows = await this.prisma.reel.findMany({
      where: { authorId: ownerId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: reelInclude(viewerId),
      ...pageArgs(query),
    });
    return toPage(rows, query, (row) => this.toDto(row));
  }

  async get(viewerId: string, id: string): Promise<ReelDto> {
    const reel = await this.prisma.reel.findUnique({ where: { id }, include: reelInclude(viewerId) });
    if (!reel) {
      throw new NotFoundException('Reel not found');
    }
    await this.visibility.assertCanSeeEntity(viewerId, reel.authorId);
    return this.toDto(reel);
  }

  async view(viewerId: string, id: string): Promise<void> {
    const reel = await this.assertVisible(viewerId, id);
    if (reel.authorId !== viewerId) {
      await this.prisma.reel.update({ where: { id }, data: { viewsCount: { increment: 1 } } });
    }
  }

  async remove(userId: string, id: string): Promise<void> {
    const reel = await this.prisma.reel.findUnique({
      where: { id },
      select: { authorId: true, video: { select: { id: true, storageKey: true } }, thumbnail: { select: { id: true, storageKey: true } } },
    });
    if (!reel) {
      throw new NotFoundException('Reel not found');
    }
    if (reel.authorId !== userId) {
      throw new ForbiddenException('Only the author can delete this reel');
    }
    const media = [reel.video, reel.thumbnail].filter((m): m is { id: string; storageKey: string } => m !== null);
    await this.prisma.$transaction([
      this.prisma.reel.delete({ where: { id } }),
      this.prisma.media.deleteMany({ where: { id: { in: media.map((m) => m.id) } } }),
    ]);
    await this.media.removeFiles(media.map((m) => m.storageKey));
  }

  async assertVisible(viewerId: string, id: string): Promise<VisibleReel> {
    const reel = await this.prisma.reel.findUnique({
      where: { id },
      select: { id: true, authorId: true, allowComments: true },
    });
    if (!reel) {
      throw new NotFoundException('Reel not found');
    }
    await this.visibility.assertCanSeeEntity(viewerId, reel.authorId);
    return reel;
  }

  toDto(row: ReelRow): ReelDto {
    return {
      id: row.id,
      author: this.mapper.user(row.author),
      caption: row.caption,
      video: this.mapper.media(row.video),
      thumbnail: row.thumbnail ? this.mapper.media(row.thumbnail) : null,
      durationSec: row.durationSec,
      hashtags: row.hashtags.map((h) => h.hashtag.name),
      viewsCount: row.viewsCount,
      likesCount: row._count.likes,
      commentsCount: row._count.comments,
      likedByMe: row.likes.length > 0,
      allowComments: row.allowComments,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
