import { Injectable, NotFoundException } from '@nestjs/common';
import { RealtimeEvents, type NotificationDto, type Paginated } from '@insta/shared';
import { PrismaService } from '../prisma/prisma.service';
import { DtoMapper, userSummarySelect } from '../common/mappers/dto-mapper.service';
import { PaginationQueryDto, pageArgs, toPage } from '../common/pagination/pagination';
import { RealtimeService } from '../realtime/realtime.service';
import { VisibilityService } from '../privacy/visibility.service';
import { NotificationSettings, NotificationType } from '../generated/prisma/client';

export interface NotifyInput {
  recipientId: string;
  actorId: string;
  type: NotificationType;
  entityId?: string | null;
  preview?: string | null;
}

const SETTING_BY_TYPE: Record<NotificationType, keyof Pick<NotificationSettings, 'likes' | 'comments' | 'follows' | 'followRequests' | 'mentions' | 'messages'>> = {
  LIKE: 'likes',
  COMMENT: 'comments',
  FOLLOW: 'follows',
  FOLLOW_ACCEPTED: 'follows',
  FOLLOW_REQUEST: 'followRequests',
  MENTION: 'mentions',
  MESSAGE: 'messages',
};

const DEDUP_TYPES: NotificationType[] = ['LIKE', 'FOLLOW', 'FOLLOW_REQUEST', 'MESSAGE'];
const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: DtoMapper,
    private readonly realtime: RealtimeService,
    private readonly visibility: VisibilityService,
  ) {}

  async notify(input: NotifyInput): Promise<void> {
    if (input.recipientId === input.actorId) {
      return;
    }
    if (await this.visibility.isBlockedEitherWay(input.recipientId, input.actorId)) {
      return;
    }
    const settings = await this.prisma.notificationSettings.findUnique({ where: { userId: input.recipientId } });
    if (settings && !settings[SETTING_BY_TYPE[input.type]]) {
      return;
    }
    if (DEDUP_TYPES.includes(input.type)) {
      const duplicate = await this.prisma.notification.findFirst({
        where: {
          recipientId: input.recipientId,
          actorId: input.actorId,
          type: input.type,
          entityId: input.entityId ?? null,
          ...(input.type === 'MESSAGE'
            ? { isRead: false }
            : { createdAt: { gte: new Date(Date.now() - DEDUP_WINDOW_MS) } }),
        },
        select: { id: true },
      });
      if (duplicate) {
        return;
      }
    }
    const created = await this.prisma.notification.create({
      data: {
        recipientId: input.recipientId,
        actorId: input.actorId,
        type: input.type,
        entityId: input.entityId ?? null,
        preview: input.preview ?? null,
      },
      include: { actor: { select: userSummarySelect } },
    });
    this.realtime.emitToUser(input.recipientId, RealtimeEvents.NotificationNew, this.toDto(created));
  }

  async retract(input: Omit<NotifyInput, 'preview'>): Promise<void> {
    await this.prisma.notification.deleteMany({
      where: {
        recipientId: input.recipientId,
        actorId: input.actorId,
        type: input.type,
        entityId: input.entityId ?? null,
      },
    });
  }

  async list(userId: string, query: PaginationQueryDto): Promise<Paginated<NotificationDto>> {
    const rows = await this.prisma.notification.findMany({
      where: { recipientId: userId, type: { not: 'MESSAGE' }, actor: this.visibility.notBlockedUserWhere(userId) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: { actor: { select: userSummarySelect } },
      ...pageArgs(query),
    });
    return toPage(rows, query, (row) => this.toDto(row));
  }

  async unreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { recipientId: userId, isRead: false, type: { not: 'MESSAGE' }, actor: this.visibility.notBlockedUserWhere(userId) },
    });
  }

  async markRead(userId: string, id: string): Promise<void> {
    const result = await this.prisma.notification.updateMany({
      where: { id, recipientId: userId },
      data: { isRead: true },
    });
    if (result.count === 0) {
      throw new NotFoundException('Notification not found');
    }
  }

  async markAllRead(userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: { recipientId: userId, isRead: false },
      data: { isRead: true },
    });
    return result.count;
  }

  private toDto(row: {
    id: string;
    type: NotificationType;
    entityId: string | null;
    preview: string | null;
    isRead: boolean;
    createdAt: Date;
    actor: Parameters<DtoMapper['user']>[0];
  }): NotificationDto {
    return {
      id: row.id,
      type: row.type,
      actor: this.mapper.user(row.actor),
      entityId: row.entityId,
      preview: row.preview,
      isRead: row.isRead,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
