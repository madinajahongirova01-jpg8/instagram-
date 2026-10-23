import { Injectable } from '@nestjs/common';
import type { Paginated, UserSummary } from '@insta/shared';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { VisibilityService } from '../privacy/visibility.service';
import { PostsService } from '../posts/posts.service';
import { ReelsService } from '../reels/reels.service';
import { CommentsService } from '../comments/comments.service';
import { DtoMapper, userSummarySelect } from '../common/mappers/dto-mapper.service';
import { PaginationQueryDto, pageArgs, toPage } from '../common/pagination/pagination';
import { Prisma } from '../generated/prisma/client';

export type LikeTarget = { postId: string } | { reelId: string } | { commentId: string };

import type { LikeState } from '@insta/shared';
export type { LikeState };

@Injectable()
export class LikesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly posts: PostsService,
    private readonly reels: ReelsService,
    private readonly comments: CommentsService,
    private readonly notifications: NotificationsService,
    private readonly visibility: VisibilityService,
    private readonly mapper: DtoMapper,
  ) {}

  async like(userId: string, target: LikeTarget): Promise<LikeState> {
    const { ownerId, entityId } = await this.resolve(userId, target);
    try {
      await this.prisma.like.create({ data: { userId, ...target } });
      if (!('commentId' in target)) {
        await this.notifications.notify({ recipientId: ownerId, actorId: userId, type: 'LIKE', entityId });
      }
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) {
        throw error;
      }
    }
    return { liked: true, likesCount: await this.prisma.like.count({ where: target }) };
  }

  async unlike(userId: string, target: LikeTarget): Promise<LikeState> {
    const { ownerId, entityId } = await this.resolve(userId, target);
    const removed = await this.prisma.like.deleteMany({ where: { userId, ...target } });
    if (removed.count > 0 && !('commentId' in target)) {
      await this.notifications.retract({ recipientId: ownerId, actorId: userId, type: 'LIKE', entityId });
    }
    return { liked: false, likesCount: await this.prisma.like.count({ where: target }) };
  }

  async listPostLikers(viewerId: string, postId: string, query: PaginationQueryDto): Promise<Paginated<UserSummary>> {
    await this.posts.assertVisible(viewerId, postId);
    const rows = await this.prisma.like.findMany({
      where: { postId, user: this.visibility.notBlockedUserWhere(viewerId) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { id: true, user: { select: userSummarySelect } },
      ...pageArgs(query),
    });
    return toPage(rows, query, (row) => this.mapper.user(row.user));
  }

  private async resolve(userId: string, target: LikeTarget): Promise<{ ownerId: string; entityId: string }> {
    if ('postId' in target) {
      const post = await this.posts.assertVisible(userId, target.postId);
      return { ownerId: post.authorId, entityId: post.id };
    }
    if ('reelId' in target) {
      const reel = await this.reels.assertVisible(userId, target.reelId);
      return { ownerId: reel.authorId, entityId: reel.id };
    }
    const comment = await this.comments.assertVisible(userId, target.commentId);
    return { ownerId: comment.authorId, entityId: comment.entityId };
  }
}
