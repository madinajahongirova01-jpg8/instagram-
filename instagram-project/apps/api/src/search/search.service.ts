import { Injectable } from '@nestjs/common';
import type { Paginated, PostDto, UserSummary } from '@insta/shared';
import { PrismaService } from '../prisma/prisma.service';
import { VisibilityService } from '../privacy/visibility.service';
import { PostPresenter, postInclude } from '../posts/post.presenter';
import { DtoMapper, userSummarySelect } from '../common/mappers/dto-mapper.service';
import { PaginationQueryDto, pageArgs, toPage } from '../common/pagination/pagination';
import { normalizeSearchQuery } from '../common/utils/text';
import { SearchQueryDto } from './dto/search.dto';

const RESULT_LIMIT = 20;

import type { SearchResultDto } from '@insta/shared';
export type { SearchResultDto };

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly visibility: VisibilityService,
    private readonly presenter: PostPresenter,
    private readonly mapper: DtoMapper,
  ) {}

  async search(viewerId: string, dto: SearchQueryDto): Promise<SearchResultDto> {
    const q = normalizeSearchQuery(dto.q);
    const type = dto.type ?? 'all';
    if (q.length === 0) {
      return { users: [], hashtags: [], posts: [] };
    }
    const [users, hashtags, posts] = await Promise.all([
      type === 'all' || type === 'users' ? this.users(viewerId, q) : [],
      type === 'all' || type === 'hashtags' ? this.hashtags(q) : [],
      type === 'all' || type === 'posts' ? this.posts(viewerId, q) : [],
    ]);
    return { users, hashtags, posts };
  }

  async postsByHashtag(viewerId: string, name: string, query: PaginationQueryDto): Promise<Paginated<PostDto>> {
    const tag = normalizeSearchQuery(name).toLowerCase();
    const rows = await this.prisma.post.findMany({
      where: {
        isArchived: false,
        hashtags: { some: { hashtag: { name: tag } } },
        author: this.visibility.visibleAuthorWhere(viewerId),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: postInclude(viewerId),
      ...pageArgs(query),
    });
    return toPage(rows, query, (row) => this.presenter.toDto(row, viewerId));
  }

  private async users(viewerId: string, q: string): Promise<UserSummary[]> {
    const rows = await this.prisma.user.findMany({
      where: {
        OR: [
          { username: { startsWith: q.toLowerCase() } },
          { username: { contains: q.toLowerCase() } },
          { profile: { is: { fullName: { contains: q, mode: 'insensitive' } } } },
        ],
        ...this.visibility.notBlockedUserWhere(viewerId),
      },
      orderBy: [{ followers: { _count: 'desc' } }, { username: 'asc' }],
      select: userSummarySelect,
      take: RESULT_LIMIT,
    });
    return rows.map((u) => this.mapper.user(u));
  }

  private async hashtags(q: string): Promise<{ name: string; postsCount: number }[]> {
    const rows = await this.prisma.hashtag.findMany({
      where: { name: { startsWith: q.toLowerCase() } },
      orderBy: { posts: { _count: 'desc' } },
      select: { name: true, _count: { select: { posts: true } } },
      take: RESULT_LIMIT,
    });
    return rows.map((h) => ({ name: h.name, postsCount: h._count.posts }));
  }

  private async posts(viewerId: string, q: string): Promise<PostDto[]> {
    const rows = await this.prisma.post.findMany({
      where: {
        isArchived: false,
        author: this.visibility.visibleAuthorWhere(viewerId),
        OR: [
          { hashtags: { some: { hashtag: { name: { startsWith: q.toLowerCase() } } } } },
          { caption: { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: postInclude(viewerId),
      take: RESULT_LIMIT,
    });
    return rows.map((row) => this.presenter.toDto(row, viewerId));
  }
}
