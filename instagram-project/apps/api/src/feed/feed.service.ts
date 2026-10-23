import { Injectable } from '@nestjs/common';
import type { Paginated, PostDto, UserSummary } from '@insta/shared';
import { PrismaService } from '../prisma/prisma.service';
import { VisibilityService } from '../privacy/visibility.service';
import { PostPresenter, postInclude } from '../posts/post.presenter';
import { ReelDto, ReelsService, reelInclude } from '../reels/reels.service';
import { DtoMapper, userSummarySelect } from '../common/mappers/dto-mapper.service';
import { PaginationQueryDto, pageArgs, toPage } from '../common/pagination/pagination';

const EXPLORE_WINDOW_DAYS = 30;

import type { ExploreDto } from '@insta/shared';
export type { ExploreDto };

@Injectable()
export class FeedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly visibility: VisibilityService,
    private readonly presenter: PostPresenter,
    private readonly reels: ReelsService,
    private readonly mapper: DtoMapper,
  ) {}

  async feed(userId: string, query: PaginationQueryDto): Promise<Paginated<PostDto>> {
    const rows = await this.prisma.post.findMany({
      where: {
        isArchived: false,
        OR: [{ authorId: userId }, { author: { followers: { some: { followerId: userId } } } }],
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: postInclude(userId),
      ...pageArgs(query),
    });
    return toPage(rows, query, (row) => this.presenter.toDto(row, userId));
  }

  async explore(userId: string): Promise<ExploreDto> {
    const since = new Date(Date.now() - EXPLORE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const notMineOrFollowed = {
      id: { not: userId },
      followers: { none: { followerId: userId } },
      privacySettings: { is: { isPrivate: false } },
      ...this.visibility.notBlockedUserWhere(userId),
    };
    const [posts, reels, hashtags, users] = await Promise.all([
      this.prisma.post.findMany({
        where: { isArchived: false, createdAt: { gte: since }, author: notMineOrFollowed },
        orderBy: [{ likes: { _count: 'desc' } }, { comments: { _count: 'desc' } }, { createdAt: 'desc' }],
        include: postInclude(userId),
        take: 30,
      }),
      this.prisma.reel.findMany({
        where: { createdAt: { gte: since }, author: notMineOrFollowed },
        orderBy: [{ likes: { _count: 'desc' } }, { viewsCount: 'desc' }, { createdAt: 'desc' }],
        include: reelInclude(userId),
        take: 20,
      }),
      this.prisma.hashtag.findMany({
        where: { posts: { some: { post: { createdAt: { gte: since } } } } },
        orderBy: { posts: { _count: 'desc' } },
        select: { name: true, _count: { select: { posts: true } } },
        take: 20,
      }),
      this.prisma.user.findMany({
        where: { id: { not: userId }, followers: { none: { followerId: userId } }, ...this.visibility.notBlockedUserWhere(userId) },
        orderBy: [{ followers: { _count: 'desc' } }, { createdAt: 'desc' }],
        select: userSummarySelect,
        take: 20,
      }),
    ]);
    return {
      posts: posts.map((p) => this.presenter.toDto(p, userId)),
      reels: reels.map((r) => this.reels.toDto(r)),
      trendingHashtags: hashtags.map((h) => ({ name: h.name, postsCount: h._count.posts })),
      suggestedUsers: users.map((u) => this.mapper.user(u)),
    };
  }
}
