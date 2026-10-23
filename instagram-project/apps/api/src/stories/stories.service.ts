import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { STORY_TTL_HOURS, type MediaDto, type Paginated, type UserSummary } from '@insta/shared';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import { VisibilityService } from '../privacy/visibility.service';
import { DtoMapper, mediaSelect, userSummarySelect } from '../common/mappers/dto-mapper.service';
import { PaginationQueryDto } from '../common/pagination/pagination';
import { PAGE_LIMIT_DEFAULT } from '@insta/shared';
import { Prisma, StoryAudience } from '../generated/prisma/client';
import { CreateStoryDto } from './dto/stories.dto';

function storyInclude(viewerId: string) {
  return {
    media: { select: mediaSelect },
    views: { where: { viewerId }, select: { viewerId: true } },
    _count: { select: { views: true } },
  } satisfies Prisma.StoryInclude;
}

type StoryRow = Prisma.StoryGetPayload<{ include: ReturnType<typeof storyInclude> }>;

import type { StoryDto } from '@insta/shared';
export type { StoryDto };

import type { StoryGroupDto } from '@insta/shared';
export type { StoryGroupDto };

import type { StoryViewerDto } from '@insta/shared';
export type { StoryViewerDto };

@Injectable()
export class StoriesService {
  private readonly logger = new Logger(StoriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
    private readonly visibility: VisibilityService,
    private readonly mapper: DtoMapper,
  ) {}

  async create(userId: string, dto: CreateStoryDto): Promise<StoryDto> {
    await this.media.claim(userId, [dto.mediaId], 'STORY', ['IMAGE', 'VIDEO']);
    const story = await this.prisma.story.create({
      data: {
        authorId: userId,
        mediaId: dto.mediaId,
        caption: dto.caption ?? '',
        audience: dto.audience ?? 'EVERYONE',
        expiresAt: new Date(Date.now() + STORY_TTL_HOURS * 60 * 60 * 1000),
      },
      include: storyInclude(userId),
    });
    return this.toDto(story, userId);
  }

  async feed(viewerId: string): Promise<StoryGroupDto[]> {
    const stories = await this.prisma.story.findMany({
      where: {
        expiresAt: { gt: new Date() },
        AND: [
          { OR: [{ authorId: viewerId }, { author: { followers: { some: { followerId: viewerId } } } }] },
          this.visibility.storyVisibleWhere(viewerId),
        ],
      },
      orderBy: { createdAt: 'asc' },
      include: { ...storyInclude(viewerId), author: { select: userSummarySelect } },
      take: 500,
    });
    const groups = new Map<string, StoryGroupDto>();
    for (const story of stories) {
      const group = groups.get(story.authorId) ?? {
        author: this.mapper.user(story.author),
        hasUnseen: false,
        latestAt: story.createdAt.toISOString(),
        stories: [],
      };
      const dto = this.toDto(story, viewerId);
      group.stories.push(dto);
      group.hasUnseen = group.hasUnseen || !dto.seen;
      group.latestAt = dto.createdAt;
      groups.set(story.authorId, group);
    }
    return [...groups.values()].sort((a, b) => {
      if (a.author.id === viewerId) return -1;
      if (b.author.id === viewerId) return 1;
      if (a.hasUnseen !== b.hasUnseen) return a.hasUnseen ? -1 : 1;
      return b.latestAt.localeCompare(a.latestAt);
    });
  }

  async listByUser(viewerId: string, username: string): Promise<StoryDto[]> {
    const ownerId = await this.visibility.resolveUsername(username);
    await this.visibility.assertCanViewContent(viewerId, ownerId);
    const stories = await this.prisma.story.findMany({
      where: { authorId: ownerId, expiresAt: { gt: new Date() }, ...this.visibility.storyVisibleWhere(viewerId) },
      orderBy: { createdAt: 'asc' },
      include: storyInclude(viewerId),
    });
    return stories.map((s) => this.toDto(s, viewerId));
  }

  async view(viewerId: string, storyId: string): Promise<void> {
    const story = await this.prisma.story.findFirst({
      where: { id: storyId, expiresAt: { gt: new Date() }, ...this.visibility.storyVisibleWhere(viewerId) },
      select: { authorId: true },
    });
    if (!story) {
      throw new NotFoundException('Story not found');
    }
    if (story.authorId === viewerId) {
      return;
    }
    await this.prisma.storyView.upsert({
      where: { storyId_viewerId: { storyId, viewerId } },
      update: {},
      create: { storyId, viewerId },
    });
  }

  async viewers(userId: string, storyId: string, query: PaginationQueryDto): Promise<Paginated<StoryViewerDto>> {
    const story = await this.prisma.story.findUnique({ where: { id: storyId }, select: { authorId: true } });
    if (!story) {
      throw new NotFoundException('Story not found');
    }
    if (story.authorId !== userId) {
      throw new ForbiddenException('Only the author can see viewers');
    }
    const limit = query.limit ?? PAGE_LIMIT_DEFAULT;
    const rows = await this.prisma.storyView.findMany({
      where: { storyId },
      orderBy: [{ viewedAt: 'desc' }, { viewerId: 'desc' }],
      take: limit + 1,
      ...(query.cursor ? { skip: 1, cursor: { storyId_viewerId: { storyId, viewerId: query.cursor } } } : {}),
      include: { viewer: { select: userSummarySelect } },
    });
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: page.map((r) => ({ user: this.mapper.user(r.viewer), viewedAt: r.viewedAt.toISOString() })),
      nextCursor: hasMore ? page[page.length - 1].viewerId : null,
    };
  }

  async remove(userId: string, storyId: string): Promise<void> {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
      select: { authorId: true, media: { select: { id: true, storageKey: true } } },
    });
    if (!story) {
      throw new NotFoundException('Story not found');
    }
    if (story.authorId !== userId) {
      throw new ForbiddenException('Only the author can delete this story');
    }
    await this.prisma.media.delete({ where: { id: story.media.id } });
    await this.media.removeFiles([story.media.storageKey]);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async purgeExpired(): Promise<number> {
    const expired = await this.prisma.story.findMany({
      where: { expiresAt: { lte: new Date() } },
      select: { media: { select: { id: true, storageKey: true } } },
      take: 1000,
    });
    if (expired.length === 0) {
      return 0;
    }
    await this.prisma.media.deleteMany({ where: { id: { in: expired.map((s) => s.media.id) } } });
    await this.media.removeFiles(expired.map((s) => s.media.storageKey));
    this.logger.log({ count: expired.length }, 'Expired stories purged');
    return expired.length;
  }

  private toDto(row: StoryRow, viewerId: string): StoryDto {
    return {
      id: row.id,
      authorId: row.authorId,
      media: this.mapper.media(row.media),
      caption: row.caption,
      audience: row.audience,
      seen: row.authorId === viewerId || row.views.length > 0,
      viewsCount: row.authorId === viewerId ? row._count.views : null,
      createdAt: row.createdAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
    };
  }
}
