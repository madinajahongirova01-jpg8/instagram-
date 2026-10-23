import { Injectable } from '@nestjs/common';
import type { PostDto } from '@insta/shared';
import { Prisma } from '../generated/prisma/client';
import { DtoMapper, mediaSelect, userSummarySelect } from '../common/mappers/dto-mapper.service';

export function postInclude(viewerId: string) {
  return {
    author: { select: userSummarySelect },
    media: { select: mediaSelect, orderBy: { position: 'asc' } },
    hashtags: { select: { hashtag: { select: { name: true } } } },
    likes: { where: { userId: viewerId }, select: { id: true }, take: 1 },
    savedBy: { where: { userId: viewerId }, select: { userId: true }, take: 1 },
    _count: { select: { likes: true, comments: true } },
  } satisfies Prisma.PostInclude;
}

export type PostRow = Prisma.PostGetPayload<{ include: ReturnType<typeof postInclude> }>;

@Injectable()
export class PostPresenter {
  constructor(private readonly mapper: DtoMapper) {}

  toDto(row: PostRow, viewerId: string): PostDto {
    const hideCount = row.hideLikeCount && row.authorId !== viewerId;
    return {
      id: row.id,
      author: this.mapper.user(row.author),
      caption: row.caption,
      location: row.location,
      media: row.media.map((m) => this.mapper.media(m)),
      hashtags: row.hashtags.map((h) => h.hashtag.name),
      likesCount: hideCount ? null : row._count.likes,
      commentsCount: row._count.comments,
      likedByMe: row.likes.length > 0,
      savedByMe: row.savedBy.length > 0,
      commentsDisabled: row.commentsDisabled,
      hideLikeCount: row.hideLikeCount,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
