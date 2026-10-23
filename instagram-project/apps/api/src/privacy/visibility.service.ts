import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Audience, Prisma } from '../generated/prisma/client';

export interface Relation {
  isSelf: boolean;
  isPrivate: boolean;
  viewerFollows: boolean;
  ownerFollowsViewer: boolean;
  blockedByViewer: boolean;
  blockedByOwner: boolean;
  requested: boolean;
}

@Injectable()
export class VisibilityService {
  constructor(private readonly prisma: PrismaService) {}

  async relation(viewerId: string, ownerId: string): Promise<Relation> {
    if (viewerId === ownerId) {
      return {
        isSelf: true,
        isPrivate: false,
        viewerFollows: false,
        ownerFollowsViewer: false,
        blockedByViewer: false,
        blockedByOwner: false,
        requested: false,
      };
    }
    const [privacy, follows, followedBy, blocks, request] = await Promise.all([
      this.prisma.privacySettings.findUnique({ where: { userId: ownerId }, select: { isPrivate: true } }),
      this.prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: viewerId, followingId: ownerId } },
        select: { followerId: true },
      }),
      this.prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: ownerId, followingId: viewerId } },
        select: { followerId: true },
      }),
      this.prisma.block.findMany({
        where: {
          OR: [
            { blockerId: viewerId, blockedId: ownerId },
            { blockerId: ownerId, blockedId: viewerId },
          ],
        },
        select: { blockerId: true },
      }),
      this.prisma.followRequest.findUnique({
        where: { requesterId_targetId: { requesterId: viewerId, targetId: ownerId } },
        select: { status: true },
      }),
    ]);
    return {
      isSelf: false,
      isPrivate: privacy?.isPrivate ?? false,
      viewerFollows: follows !== null,
      ownerFollowsViewer: followedBy !== null,
      blockedByViewer: blocks.some((b) => b.blockerId === viewerId),
      blockedByOwner: blocks.some((b) => b.blockerId === ownerId),
      requested: request?.status === 'PENDING',
    };
  }

  async resolveUsername(username: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user.id;
  }

  canViewContent(relation: Relation): boolean {
    if (relation.isSelf) {
      return true;
    }
    if (relation.blockedByOwner || relation.blockedByViewer) {
      return false;
    }
    return !relation.isPrivate || relation.viewerFollows;
  }

  async assertCanViewContent(viewerId: string, ownerId: string): Promise<Relation> {
    const relation = await this.relation(viewerId, ownerId);
    if (relation.blockedByOwner) {
      throw new NotFoundException('Not found');
    }
    if (!this.canViewContent(relation)) {
      throw new ForbiddenException('This account is private');
    }
    return relation;
  }

  async assertCanSeeEntity(viewerId: string, ownerId: string): Promise<void> {
    const relation = await this.relation(viewerId, ownerId);
    if (!this.canViewContent(relation)) {
      throw new NotFoundException('Not found');
    }
  }

  async isBlockedEitherWay(a: string, b: string): Promise<boolean> {
    if (a === b) {
      return false;
    }
    const count = await this.prisma.block.count({
      where: {
        OR: [
          { blockerId: a, blockedId: b },
          { blockerId: b, blockedId: a },
        ],
      },
    });
    return count > 0;
  }

  async allows(audience: Audience, actorId: string, ownerId: string): Promise<boolean> {
    if (actorId === ownerId) {
      return true;
    }
    if (audience === 'NO_ONE') {
      return false;
    }
    if (audience === 'EVERYONE') {
      return true;
    }
    if (audience === 'FOLLOWING') {
      const ownerFollows = await this.prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: ownerId, followingId: actorId } },
        select: { followerId: true },
      });
      return ownerFollows !== null;
    }
    const follow = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: actorId, followingId: ownerId } },
      select: { followerId: true },
    });
    return follow !== null;
  }

  visibleAuthorWhere(viewerId: string): Prisma.UserWhereInput {
    return {
      blocking: { none: { blockedId: viewerId } },
      blockedBy: { none: { blockerId: viewerId } },
      OR: [
        { id: viewerId },
        { privacySettings: { is: { isPrivate: false } } },
        { followers: { some: { followerId: viewerId } } },
      ],
    };
  }

  storyVisibleWhere(viewerId: string): Prisma.StoryWhereInput {
    const follower = { followers: { some: { followerId: viewerId } } };
    return {
      OR: [
        { authorId: viewerId },
        {
          author: { ...this.notBlockedUserWhere(viewerId), storyHides: { none: { hiddenUserId: viewerId } } },
          OR: [
            { audience: 'EVERYONE', author: { OR: [{ privacySettings: { is: { isPrivate: false } } }, follower] } },
            { audience: 'FOLLOWERS', author: follower },
            { audience: 'CLOSE_FRIENDS', author: { closeFriends: { some: { friendId: viewerId } } } },
          ],
        },
      ],
    };
  }

  notBlockedUserWhere(viewerId: string): Prisma.UserWhereInput {
    return {
      blocking: { none: { blockedId: viewerId } },
      blockedBy: { none: { blockerId: viewerId } },
    };
  }
}
