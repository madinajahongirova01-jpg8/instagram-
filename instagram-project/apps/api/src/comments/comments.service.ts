import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Paginated, UserSummary } from '@insta/shared';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { VisibilityService } from '../privacy/visibility.service';
import { PostsService } from '../posts/posts.service';
import { ReelsService } from '../reels/reels.service';
import { TaggingService } from '../posts/tagging.service';
import { DtoMapper, userSummarySelect } from '../common/mappers/dto-mapper.service';
import { PaginationQueryDto, pageArgs, toPage } from '../common/pagination/pagination';
import { preview } from '../common/utils/text';
import { Prisma } from '../generated/prisma/client';
import { CreateCommentDto } from './dto/comments.dto';

export type CommentTarget = { postId: string } | { reelId: string };

interface ResolvedTarget {
  where: { postId: string } | { reelId: string };
  ownerId: string;
  commentsAllowed: boolean;
  entityId: string;
}

function commentInclude(viewerId: string) {
  return {
    author: { select: userSummarySelect },
    likes: { where: { userId: viewerId }, select: { id: true }, take: 1 },
    _count: { select: { likes: true, replies: true } },
  } satisfies Prisma.CommentInclude;
}

type CommentRow = Prisma.CommentGetPayload<{ include: ReturnType<typeof commentInclude> }>;

import type { CommentDto } from '@insta/shared';
export type { CommentDto };

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly posts: PostsService,
    private readonly reels: ReelsService,
    private readonly tagging: TaggingService,
    private readonly notifications: NotificationsService,
    private readonly visibility: VisibilityService,
    private readonly mapper: DtoMapper,
  ) {}

  async list(viewerId: string, target: CommentTarget, query: PaginationQueryDto): Promise<Paginated<CommentDto>> {
    const resolved = await this.resolveTarget(viewerId, target);
    const rows = await this.prisma.comment.findMany({
      where: { ...resolved.where, parentId: null, author: this.visibility.notBlockedUserWhere(viewerId) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: commentInclude(viewerId),
      ...pageArgs(query),
    });
    return toPage(rows, query, (row) => this.toDto(row));
  }

  async replies(viewerId: string, commentId: string, query: PaginationQueryDto): Promise<Paginated<CommentDto>> {
    await this.assertVisible(viewerId, commentId);
    const rows = await this.prisma.comment.findMany({
      where: { parentId: commentId, author: this.visibility.notBlockedUserWhere(viewerId) },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      include: commentInclude(viewerId),
      ...pageArgs(query),
    });
    return toPage(rows, query, (row) => this.toDto(row));
  }

  async create(userId: string, target: CommentTarget, dto: CreateCommentDto): Promise<CommentDto> {
    const resolved = await this.resolveTarget(userId, target);
    if (!resolved.commentsAllowed) {
      throw new ForbiddenException('Comments are disabled');
    }
    const owner = await this.prisma.privacySettings.findUnique({
      where: { userId: resolved.ownerId },
      select: { allowComments: true },
    });
    if (!(await this.visibility.allows(owner?.allowComments ?? 'EVERYONE', userId, resolved.ownerId))) {
      throw new ForbiddenException('The author does not accept comments from you');
    }
    let parentId: string | null = null;
    let parentAuthorId: string | null = null;
    if (dto.parentId) {
      const parent = await this.prisma.comment.findUnique({
        where: { id: dto.parentId },
        select: { id: true, parentId: true, postId: true, reelId: true, authorId: true },
      });
      const sameTarget =
        parent && ('postId' in resolved.where ? parent.postId === resolved.where.postId : parent.reelId === resolved.where.reelId);
      if (!parent || !sameTarget) {
        throw new BadRequestException('Parent comment does not belong to this item');
      }
      parentId = parent.parentId ?? parent.id;
      parentAuthorId = parent.authorId;
    }
    const comment = await this.prisma.comment.create({
      data: { authorId: userId, content: dto.content, parentId, ...resolved.where },
      include: commentInclude(userId),
    });
    const text = preview(dto.content);
    await this.notifications.notify({
      recipientId: resolved.ownerId,
      actorId: userId,
      type: 'COMMENT',
      entityId: resolved.entityId,
      preview: text,
    });
    if (parentAuthorId && parentAuthorId !== resolved.ownerId) {
      await this.notifications.notify({
        recipientId: parentAuthorId,
        actorId: userId,
        type: 'COMMENT',
        entityId: resolved.entityId,
        preview: text,
      });
    }
    const mentioned = await this.tagging.mentionTargets(userId, dto.content);
    await Promise.all(
      mentioned.map((recipientId) =>
        this.notifications.notify({ recipientId, actorId: userId, type: 'MENTION', entityId: resolved.entityId, preview: text }),
      ),
    );
    return this.toDto(comment);
  }

  async remove(userId: string, commentId: string): Promise<void> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { authorId: true, post: { select: { authorId: true } }, reel: { select: { authorId: true } } },
    });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    const ownerId = comment.post?.authorId ?? comment.reel?.authorId;
    if (comment.authorId !== userId && ownerId !== userId) {
      throw new ForbiddenException('Only the comment author or the post owner can delete it');
    }
    await this.prisma.comment.delete({ where: { id: commentId } });
  }

  async assertVisible(viewerId: string, commentId: string): Promise<{ id: string; authorId: string; entityId: string }> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, authorId: true, postId: true, reelId: true },
    });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.postId) {
      await this.posts.assertVisible(viewerId, comment.postId);
    } else if (comment.reelId) {
      await this.reels.assertVisible(viewerId, comment.reelId);
    }
    if (await this.visibility.isBlockedEitherWay(viewerId, comment.authorId)) {
      throw new NotFoundException('Comment not found');
    }
    return { id: comment.id, authorId: comment.authorId, entityId: (comment.postId ?? comment.reelId) as string };
  }

  private async resolveTarget(viewerId: string, target: CommentTarget): Promise<ResolvedTarget> {
    if ('postId' in target) {
      const post = await this.posts.assertVisible(viewerId, target.postId);
      return { where: { postId: post.id }, ownerId: post.authorId, commentsAllowed: !post.commentsDisabled, entityId: post.id };
    }
    const reel = await this.reels.assertVisible(viewerId, target.reelId);
    return { where: { reelId: reel.id }, ownerId: reel.authorId, commentsAllowed: reel.allowComments, entityId: reel.id };
  }

  private toDto(row: CommentRow): CommentDto {
    return {
      id: row.id,
      author: this.mapper.user(row.author),
      content: row.content,
      parentId: row.parentId,
      likesCount: row._count.likes,
      repliesCount: row._count.replies,
      likedByMe: row.likes.length > 0,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
