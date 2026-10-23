import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PAGE_LIMIT_DEFAULT, type Paginated, type PostDto } from '@insta/shared';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import { NotificationsService } from '../notifications/notifications.service';
import { VisibilityService } from '../privacy/visibility.service';
import { PaginationQueryDto, pageArgs, toPage } from '../common/pagination/pagination';
import { extractHashtags, preview } from '../common/utils/text';
import { CreatePostDto, UpdatePostDto } from './dto/posts.dto';
import { PostPresenter, postInclude } from './post.presenter';
import { TaggingService } from './tagging.service';

export interface VisiblePost {
  id: string;
  authorId: string;
  commentsDisabled: boolean;
}

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
    private readonly notifications: NotificationsService,
    private readonly visibility: VisibilityService,
    private readonly tagging: TaggingService,
    private readonly presenter: PostPresenter,
  ) {}

  async create(userId: string, dto: CreatePostDto): Promise<PostDto> {
    const media = await this.media.claim(userId, dto.mediaIds, 'POST', ['IMAGE', 'VIDEO']);
    const caption = dto.caption ?? '';
    const mentionIds = await this.tagging.mentionTargets(userId, caption);
    const post = await this.prisma.$transaction(async (tx) => {
      const created = await tx.post.create({
        data: {
          authorId: userId,
          caption,
          location: dto.location ?? null,
          commentsDisabled: dto.commentsDisabled ?? false,
          hideLikeCount: dto.hideLikeCount ?? false,
          hashtags: { create: this.tagging.hashtagCreates(extractHashtags(caption)) },
          mentions: { create: mentionIds.map((id) => ({ userId: id })) },
        },
      });
      for (const [index, m] of media.entries()) {
        const attached = await tx.media.updateMany({
          where: { id: m.id, postId: null },
          data: { postId: created.id, position: index },
        });
        if (attached.count !== 1) {
          throw new ConflictException('Media is already attached to another post');
        }
      }
      return tx.post.findUniqueOrThrow({ where: { id: created.id }, include: postInclude(userId) });
    });
    await this.notifyMentions(userId, post.id, mentionIds, caption);
    return this.presenter.toDto(post, userId);
  }

  async get(viewerId: string, postId: string): Promise<PostDto> {
    const post = await this.prisma.post.findUnique({ where: { id: postId }, include: postInclude(viewerId) });
    if (!post || (post.isArchived && post.authorId !== viewerId)) {
      throw new NotFoundException('Post not found');
    }
    await this.visibility.assertCanSeeEntity(viewerId, post.authorId);
    return this.presenter.toDto(post, viewerId);
  }

  async update(userId: string, postId: string, dto: UpdatePostDto): Promise<PostDto> {
    const existing = await this.assertOwner(userId, postId);
    let newMentions: string[] = [];
    const post = await this.prisma.$transaction(async (tx) => {
      if (dto.caption !== undefined && dto.caption !== existing.caption) {
        const mentionIds = await this.tagging.mentionTargets(userId, dto.caption);
        const previous = await tx.postMention.findMany({ where: { postId }, select: { userId: true } });
        newMentions = mentionIds.filter((id) => !previous.some((p) => p.userId === id));
        await tx.postHashtag.deleteMany({ where: { postId } });
        await tx.postMention.deleteMany({ where: { postId } });
        await tx.post.update({
          where: { id: postId },
          data: {
            hashtags: { create: this.tagging.hashtagCreates(extractHashtags(dto.caption)) },
            mentions: { create: mentionIds.map((id) => ({ userId: id })) },
          },
        });
      }
      return tx.post.update({
        where: { id: postId },
        data: {
          caption: dto.caption,
          location: dto.location,
          commentsDisabled: dto.commentsDisabled,
          hideLikeCount: dto.hideLikeCount,
          isArchived: dto.isArchived,
        },
        include: postInclude(userId),
      });
    });
    await this.notifyMentions(userId, postId, newMentions, post.caption);
    return this.presenter.toDto(post, userId);
  }

  async remove(userId: string, postId: string): Promise<void> {
    await this.assertOwner(userId, postId);
    const files = await this.prisma.media.findMany({ where: { postId }, select: { storageKey: true } });
    await this.prisma.post.delete({ where: { id: postId } });
    await this.media.removeFiles(files.map((f) => f.storageKey));
  }

  async listByUser(viewerId: string, username: string, query: PaginationQueryDto): Promise<Paginated<PostDto>> {
    const ownerId = await this.visibility.resolveUsername(username);
    await this.visibility.assertCanViewContent(viewerId, ownerId);
    const rows = await this.prisma.post.findMany({
      where: { authorId: ownerId, isArchived: false },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: postInclude(viewerId),
      ...pageArgs(query),
    });
    return toPage(rows, query, (row) => this.presenter.toDto(row, viewerId));
  }

  async save(userId: string, postId: string): Promise<{ saved: boolean }> {
    await this.assertVisible(userId, postId);
    await this.prisma.savedPost.upsert({
      where: { userId_postId: { userId, postId } },
      update: {},
      create: { userId, postId },
    });
    return { saved: true };
  }

  async unsave(userId: string, postId: string): Promise<{ saved: boolean }> {
    await this.prisma.savedPost.deleteMany({ where: { userId, postId } });
    return { saved: false };
  }

  async saved(userId: string, query: PaginationQueryDto): Promise<Paginated<PostDto>> {
    const limit = query.limit ?? PAGE_LIMIT_DEFAULT;
    const rows = await this.prisma.savedPost.findMany({
      where: { userId, post: { isArchived: false, author: this.visibility.visibleAuthorWhere(userId) } },
      orderBy: [{ createdAt: 'desc' }, { postId: 'desc' }],
      take: limit + 1,
      ...(query.cursor ? { skip: 1, cursor: { userId_postId: { userId, postId: query.cursor } } } : {}),
      select: { post: { include: postInclude(userId) } },
    });
    return toPage(
      rows.map((r) => r.post),
      query,
      (post) => this.presenter.toDto(post, userId),
    );
  }

  async assertVisible(viewerId: string, postId: string): Promise<VisiblePost> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true, commentsDisabled: true, isArchived: true },
    });
    if (!post || (post.isArchived && post.authorId !== viewerId)) {
      throw new NotFoundException('Post not found');
    }
    await this.visibility.assertCanSeeEntity(viewerId, post.authorId);
    return post;
  }

  private async assertOwner(userId: string, postId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId }, select: { authorId: true, caption: true } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    if (post.authorId !== userId) {
      throw new ForbiddenException('Only the author can change this post');
    }
    return post;
  }

  private async notifyMentions(actorId: string, postId: string, userIds: string[], caption: string): Promise<void> {
    await Promise.all(
      userIds.map((recipientId) =>
        this.notifications.notify({ recipientId, actorId, type: 'MENTION', entityId: postId, preview: preview(caption) }),
      ),
    );
  }
}
