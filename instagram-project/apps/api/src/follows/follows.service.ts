import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { FollowStatus, Paginated, UserSummary } from '@insta/shared';
import { PAGE_LIMIT_DEFAULT } from '@insta/shared';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { VisibilityService } from '../privacy/visibility.service';
import { DtoMapper, userSummarySelect } from '../common/mappers/dto-mapper.service';
import { PaginationQueryDto, pageArgs, toPage } from '../common/pagination/pagination';

import type { FollowRequestDto } from '@insta/shared';
export type { FollowRequestDto };

import type { FollowListItem } from '@insta/shared';
export type { FollowListItem };

@Injectable()
export class FollowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly visibility: VisibilityService,
    private readonly mapper: DtoMapper,
  ) {}

  async follow(userId: string, targetId: string): Promise<{ status: FollowStatus }> {
    if (userId === targetId) {
      throw new BadRequestException('You cannot follow yourself');
    }
    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, privacySettings: { select: { isPrivate: true } } },
    });
    if (!target || (await this.visibility.isBlockedEitherWay(userId, targetId))) {
      throw new NotFoundException('User not found');
    }
    const existing = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: userId, followingId: targetId } },
    });
    if (existing) {
      return { status: 'FOLLOWING' };
    }
    if (target.privacySettings?.isPrivate) {
      const request = await this.prisma.followRequest.upsert({
        where: { requesterId_targetId: { requesterId: userId, targetId } },
        update: { status: 'PENDING' },
        create: { requesterId: userId, targetId },
      });
      await this.notifications.notify({ recipientId: targetId, actorId: userId, type: 'FOLLOW_REQUEST', entityId: request.id });
      return { status: 'REQUESTED' };
    }
    await this.prisma.follow.upsert({
      where: { followerId_followingId: { followerId: userId, followingId: targetId } },
      update: {},
      create: { followerId: userId, followingId: targetId },
    });
    await this.notifications.notify({ recipientId: targetId, actorId: userId, type: 'FOLLOW' });
    return { status: 'FOLLOWING' };
  }

  async unfollow(userId: string, targetId: string): Promise<{ status: FollowStatus }> {
    const pending = await this.prisma.followRequest.findUnique({
      where: { requesterId_targetId: { requesterId: userId, targetId } },
      select: { id: true, status: true },
    });
    await this.prisma.$transaction([
      this.prisma.follow.deleteMany({ where: { followerId: userId, followingId: targetId } }),
      this.prisma.followRequest.deleteMany({ where: { requesterId: userId, targetId } }),
    ]);
    if (pending?.status === 'PENDING') {
      await this.notifications.retract({ recipientId: targetId, actorId: userId, type: 'FOLLOW_REQUEST', entityId: pending.id });
    }
    return { status: 'NONE' };
  }

  async removeFollower(userId: string, followerId: string): Promise<void> {
    await this.prisma.follow.deleteMany({ where: { followerId, followingId: userId } });
  }

  async incomingRequests(userId: string, query: PaginationQueryDto): Promise<Paginated<FollowRequestDto>> {
    const rows = await this.prisma.followRequest.findMany({
      where: { targetId: userId, status: 'PENDING' },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: { requester: { select: userSummarySelect } },
      ...pageArgs(query),
    });
    return toPage(rows, query, (row) => ({
      id: row.id,
      requester: this.mapper.user(row.requester),
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async accept(userId: string, requestId: string): Promise<void> {
    const request = await this.ownPendingRequest(userId, requestId);
    await this.prisma.$transaction([
      this.prisma.follow.upsert({
        where: { followerId_followingId: { followerId: request.requesterId, followingId: userId } },
        update: {},
        create: { followerId: request.requesterId, followingId: userId },
      }),
      this.prisma.followRequest.update({ where: { id: requestId }, data: { status: 'ACCEPTED' } }),
    ]);
    await this.notifications.retract({ recipientId: userId, actorId: request.requesterId, type: 'FOLLOW_REQUEST', entityId: requestId });
    await this.notifications.notify({ recipientId: request.requesterId, actorId: userId, type: 'FOLLOW_ACCEPTED' });
  }

  async decline(userId: string, requestId: string): Promise<void> {
    const request = await this.ownPendingRequest(userId, requestId);
    await this.prisma.followRequest.update({ where: { id: requestId }, data: { status: 'DECLINED' } });
    await this.notifications.retract({ recipientId: userId, actorId: request.requesterId, type: 'FOLLOW_REQUEST', entityId: requestId });
  }

  async followers(viewerId: string, username: string, query: PaginationQueryDto): Promise<Paginated<FollowListItem>> {
    const ownerId = await this.visibility.resolveUsername(username);
    await this.visibility.assertCanViewContent(viewerId, ownerId);
    return this.list(viewerId, query, 'followers', ownerId);
  }

  async following(viewerId: string, username: string, query: PaginationQueryDto): Promise<Paginated<FollowListItem>> {
    const ownerId = await this.visibility.resolveUsername(username);
    await this.visibility.assertCanViewContent(viewerId, ownerId);
    return this.list(viewerId, query, 'following', ownerId);
  }

  private async list(
    viewerId: string,
    query: PaginationQueryDto,
    direction: 'followers' | 'following',
    ownerId: string,
  ): Promise<Paginated<FollowListItem>> {
    const limit = query.limit ?? PAGE_LIMIT_DEFAULT;
    const users = await this.prisma.user.findMany({
      where: {
        ...(direction === 'followers'
          ? { following: { some: { followingId: ownerId } } }
          : { followers: { some: { followerId: ownerId } } }),
        ...this.visibility.notBlockedUserWhere(viewerId),
      },
      orderBy: { id: 'asc' },
      select: { ...userSummarySelect, followers: { where: { followerId: viewerId }, select: { followerId: true } } },
      ...pageArgs({ ...query, limit }),
    });
    return toPage(users, { ...query, limit }, (u) => ({ ...this.mapper.user(u), followedByMe: u.followers.length > 0 }));
  }

  private async ownPendingRequest(userId: string, requestId: string) {
    const request = await this.prisma.followRequest.findUnique({ where: { id: requestId } });
    if (!request || request.status !== 'PENDING') {
      throw new NotFoundException('Follow request not found');
    }
    if (request.targetId !== userId) {
      throw new ForbiddenException();
    }
    return request;
  }
}
