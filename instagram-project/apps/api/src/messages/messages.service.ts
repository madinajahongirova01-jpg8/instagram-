import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { RealtimeEvents, type MediaDto, type Paginated, type UserSummary } from '@insta/shared';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeService } from '../realtime/realtime.service';
import { VisibilityService } from '../privacy/visibility.service';
import { DtoMapper, mediaSelect, userSummarySelect } from '../common/mappers/dto-mapper.service';
import { PaginationQueryDto, pageArgs, toPage } from '../common/pagination/pagination';
import { preview } from '../common/utils/text';
import { MediaKind, MessageType, Prisma } from '../generated/prisma/client';
import { CreateConversationDto, SendMessageDto } from './dto/messages.dto';

const messageInclude = {
  sender: { select: userSummarySelect },
  media: { select: mediaSelect },
  sharedPost: {
    select: {
      id: true,
      authorId: true,
      isArchived: true,
      author: { select: userSummarySelect },
      media: { select: mediaSelect, orderBy: { position: 'asc' as const }, take: 1 },
    },
  },
  reactions: { select: { userId: true, emoji: true } },
} satisfies Prisma.MessageInclude;

type MessageRow = Prisma.MessageGetPayload<{ include: typeof messageInclude }>;

const MEDIA_KIND_BY_TYPE: Partial<Record<MessageType, MediaKind>> = {
  IMAGE: 'IMAGE',
  VIDEO: 'VIDEO',
  AUDIO: 'AUDIO',
};

import type { MessageDto } from '@insta/shared';
export type { MessageDto };

import type { ConversationParticipantDto } from '@insta/shared';
export type { ConversationParticipantDto };

import type { ConversationDto } from '@insta/shared';
export type { ConversationDto };

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeService,
    private readonly visibility: VisibilityService,
    private readonly mapper: DtoMapper,
  ) {}

  async listConversations(userId: string, query: PaginationQueryDto): Promise<Paginated<ConversationDto>> {
    const rows = await this.prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
      orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
      select: { id: true },
      ...pageArgs(query),
    });
    const page = toPage(rows, query, (r) => r.id);
    const items = await Promise.all(page.items.map((id) => this.conversationDto(userId, id)));
    return { items, nextCursor: page.nextCursor };
  }

  async createConversation(userId: string, dto: CreateConversationDto): Promise<ConversationDto> {
    const others = [...new Set(dto.participantIds)].filter((id) => id !== userId);
    if (others.length === 0) {
      throw new BadRequestException('Add at least one other participant');
    }
    const users = await this.prisma.user.findMany({
      where: { id: { in: others } },
      select: { id: true, privacySettings: { select: { allowDirectMessages: true } } },
    });
    if (users.length !== others.length) {
      throw new NotFoundException('Some users were not found');
    }
    for (const user of users) {
      if (await this.visibility.isBlockedEitherWay(userId, user.id)) {
        throw new ForbiddenException('You cannot message this user');
      }
      if (!(await this.visibility.allows(user.privacySettings?.allowDirectMessages ?? 'EVERYONE', userId, user.id))) {
        throw new ForbiddenException('This user does not accept messages from you');
      }
    }
    if (others.length === 1) {
      const directKey = [userId, others[0]].sort().join(':');
      const conversation = await this.prisma.conversation.upsert({
        where: { directKey },
        update: {},
        create: {
          directKey,
          participants: { create: [{ userId }, { userId: others[0] }] },
        },
        select: { id: true },
      });
      return this.conversationDto(userId, conversation.id);
    }
    const conversation = await this.prisma.conversation.create({
      data: {
        isGroup: true,
        title: dto.title ?? null,
        participants: {
          create: [{ userId, role: 'ADMIN' }, ...others.map((id) => ({ userId: id }))],
        },
      },
      select: { id: true },
    });
    return this.conversationDto(userId, conversation.id);
  }

  async getConversation(userId: string, conversationId: string): Promise<ConversationDto> {
    await this.participantIds(conversationId, userId);
    return this.conversationDto(userId, conversationId);
  }

  async listMessages(userId: string, conversationId: string, query: PaginationQueryDto): Promise<Paginated<MessageDto>> {
    await this.participantIds(conversationId, userId);
    const rows = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: messageInclude,
      ...pageArgs(query),
    });
    if (!query.cursor) {
      await this.markRead(userId, conversationId);
    }
    const visibleCache = new Map<string, boolean>();
    const page = toPage(rows, query, (row) => row);
    const items = await Promise.all(page.items.map((row) => this.toMessageDto(row, userId, visibleCache)));
    return { items, nextCursor: page.nextCursor };
  }

  async send(userId: string, conversationId: string, dto: SendMessageDto): Promise<MessageDto> {
    const participantIds = await this.participantIds(conversationId, userId);
    const others = participantIds.filter((id) => id !== userId);
    const conversation = await this.prisma.conversation.findUniqueOrThrow({ where: { id: conversationId }, select: { isGroup: true } });
    if (!conversation.isGroup && others.length === 1) {
      if (await this.visibility.isBlockedEitherWay(userId, others[0])) {
        throw new ForbiddenException('You cannot message this user');
      }
      const recipient = await this.prisma.privacySettings.findUnique({
        where: { userId: others[0] },
        select: { allowDirectMessages: true },
      });
      if (!(await this.visibility.allows(recipient?.allowDirectMessages ?? 'EVERYONE', userId, others[0]))) {
        throw new ForbiddenException('This user does not accept messages from you');
      }
    }
    const type = dto.type ?? 'TEXT';
    const data = await this.validatePayload(userId, type, dto);
    const now = new Date();
    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: { conversationId, senderId: userId, type, ...data, createdAt: now },
        include: messageInclude,
      });
      await tx.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: now } });
      await tx.conversationParticipant.update({
        where: { conversationId_userId: { conversationId, userId } },
        data: { lastReadAt: now },
      });
      return created;
    });
    const dtoOut = await this.toMessageDto(message, userId, new Map());
    this.realtime.emitToUsers(participantIds, RealtimeEvents.MessageNew, dtoOut);
    await Promise.all(
      others.map((recipientId) =>
        this.notifications.notify({
          recipientId,
          actorId: userId,
          type: 'MESSAGE',
          entityId: conversationId,
          preview: type === 'TEXT' ? preview(dto.content, 60) : null,
        }),
      ),
    );
    return dtoOut;
  }

  async deleteMessage(userId: string, messageId: string): Promise<void> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { senderId: true, conversationId: true, deletedAt: true, media: { select: { id: true, storageKey: true } } },
    });
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    if (message.senderId !== userId) {
      throw new ForbiddenException('Only the sender can delete a message');
    }
    if (message.deletedAt) {
      return;
    }
    await this.prisma.$transaction([
      this.prisma.message.update({
        where: { id: messageId },
        data: { deletedAt: new Date(), content: null, mediaId: null, sharedPostId: null },
      }),
      this.prisma.messageReaction.deleteMany({ where: { messageId } }),
      ...(message.media ? [this.prisma.media.delete({ where: { id: message.media.id } })] : []),
    ]);
    if (message.media) {
      await this.media.removeFiles([message.media.storageKey]);
    }
    const participants = await this.participantIds(message.conversationId, userId);
    this.realtime.emitToUsers(participants, RealtimeEvents.MessageDeleted, {
      conversationId: message.conversationId,
      messageId,
    });
  }

  async react(userId: string, messageId: string, emoji: string | null): Promise<void> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { conversationId: true, deletedAt: true },
    });
    if (!message || message.deletedAt) {
      throw new NotFoundException('Message not found');
    }
    const participants = await this.participantIds(message.conversationId, userId);
    if (emoji) {
      await this.prisma.messageReaction.upsert({
        where: { messageId_userId: { messageId, userId } },
        update: { emoji },
        create: { messageId, userId, emoji },
      });
    } else {
      await this.prisma.messageReaction.deleteMany({ where: { messageId, userId } });
    }
    this.realtime.emitToUsers(participants, RealtimeEvents.MessageReaction, {
      conversationId: message.conversationId,
      messageId,
      userId,
      emoji,
    });
  }

  async markRead(userId: string, conversationId: string): Promise<{ readAt: string }> {
    const participants = await this.participantIds(conversationId, userId);
    const readAt = new Date();
    await this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: readAt },
    });
    await this.prisma.notification.updateMany({
      where: { recipientId: userId, type: 'MESSAGE', entityId: conversationId, isRead: false },
      data: { isRead: true },
    });
    const settings = await this.prisma.privacySettings.findUnique({ where: { userId }, select: { showReadReceipts: true } });
    if (settings?.showReadReceipts !== false) {
      this.realtime.emitToUsers(
        participants.filter((id) => id !== userId),
        RealtimeEvents.ConversationRead,
        { conversationId, userId, readAt: readAt.toISOString() },
      );
    }
    return { readAt: readAt.toISOString() };
  }

  async participantIds(conversationId: string, userId: string): Promise<string[]> {
    const participants = await this.prisma.conversationParticipant.findMany({
      where: { conversationId },
      select: { userId: true },
    });
    if (!participants.some((p) => p.userId === userId)) {
      throw new NotFoundException('Conversation not found');
    }
    return participants.map((p) => p.userId);
  }

  async unreadConversationsCount(userId: string): Promise<number> {
    const [row] = await this.prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(DISTINCT m."conversationId")::int AS count
      FROM "Message" m
      JOIN "ConversationParticipant" p ON p."conversationId" = m."conversationId" AND p."userId" = ${userId}::uuid
      WHERE m."senderId" <> ${userId}::uuid
        AND m."deletedAt" IS NULL
        AND (p."lastReadAt" IS NULL OR m."createdAt" > p."lastReadAt")`;
    return row?.count ?? 0;
  }

  async contactIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.conversationParticipant.findMany({
      where: { conversation: { participants: { some: { userId } } }, userId: { not: userId } },
      select: { userId: true },
      distinct: ['userId'],
      take: 1000,
    });
    return rows.map((r) => r.userId);
  }

  private async validatePayload(
    userId: string,
    type: MessageType,
    dto: SendMessageDto,
  ): Promise<{ content: string | null; mediaId: string | null; sharedPostId: string | null }> {
    if (type === 'TEXT') {
      if (!dto.content || dto.mediaId || dto.sharedPostId) {
        throw new BadRequestException('Text message needs content only');
      }
      return { content: dto.content, mediaId: null, sharedPostId: null };
    }
    if (type === 'POST_SHARE') {
      if (!dto.sharedPostId || dto.mediaId) {
        throw new BadRequestException('POST_SHARE message needs sharedPostId');
      }
      const post = await this.prisma.post.findUnique({ where: { id: dto.sharedPostId }, select: { authorId: true, isArchived: true } });
      if (!post || post.isArchived) {
        throw new NotFoundException('Post not found');
      }
      await this.visibility.assertCanSeeEntity(userId, post.authorId);
      return { content: dto.content ?? null, mediaId: null, sharedPostId: dto.sharedPostId };
    }
    const kind = MEDIA_KIND_BY_TYPE[type];
    if (!kind || !dto.mediaId || dto.sharedPostId) {
      throw new BadRequestException(`${type} message needs mediaId`);
    }
    await this.media.claim(userId, [dto.mediaId], 'MESSAGE', [kind]);
    return { content: dto.content ?? null, mediaId: dto.mediaId, sharedPostId: null };
  }

  private async conversationDto(userId: string, conversationId: string): Promise<ConversationDto> {
    const conversation = await this.prisma.conversation.findUniqueOrThrow({
      where: { id: conversationId },
      include: {
        participants: {
          include: {
            user: { select: { ...userSummarySelect, privacySettings: { select: { showReadReceipts: true } } } },
          },
          orderBy: { joinedAt: 'asc' },
        },
        messages: { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 1, include: messageInclude },
      },
    });
    const me = conversation.participants.find((p) => p.userId === userId);
    const unreadCount = await this.prisma.message.count({
      where: {
        conversationId,
        senderId: { not: userId },
        deletedAt: null,
        ...(me?.lastReadAt ? { createdAt: { gt: me.lastReadAt } } : {}),
      },
    });
    const last = conversation.messages[0];
    return {
      id: conversation.id,
      isGroup: conversation.isGroup,
      title: conversation.title,
      participants: conversation.participants.map((p) => ({
        ...this.mapper.user(p.user),
        lastReadAt:
          p.userId === userId || p.user.privacySettings?.showReadReceipts !== false
            ? (p.lastReadAt?.toISOString() ?? null)
            : null,
      })),
      lastMessage: last ? await this.toMessageDto(last, userId, new Map()) : null,
      lastMessageAt: conversation.lastMessageAt.toISOString(),
      unreadCount,
    };
  }

  private async toMessageDto(row: MessageRow, viewerId: string, visibleCache: Map<string, boolean>): Promise<MessageDto> {
    let sharedPost: MessageDto['sharedPost'] = null;
    if (row.sharedPost && !row.sharedPost.isArchived) {
      const authorId = row.sharedPost.authorId;
      if (!visibleCache.has(authorId)) {
        const relation = await this.visibility.relation(viewerId, authorId);
        visibleCache.set(authorId, this.visibility.canViewContent(relation));
      }
      if (visibleCache.get(authorId)) {
        const cover = row.sharedPost.media[0];
        sharedPost = {
          id: row.sharedPost.id,
          author: this.mapper.user(row.sharedPost.author),
          cover: cover ? this.mapper.media(cover) : null,
        };
      }
    }
    return {
      id: row.id,
      conversationId: row.conversationId,
      sender: this.mapper.user(row.sender),
      type: row.type,
      content: row.content,
      media: row.media ? this.mapper.media(row.media) : null,
      sharedPost,
      reactions: row.reactions,
      deleted: row.deletedAt !== null,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
