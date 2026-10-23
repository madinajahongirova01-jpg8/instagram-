import { Injectable, NotFoundException } from '@nestjs/common';
import type { CurrentUser, ProfileDto } from '@insta/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { MediaService } from '../media/media.service';
import { DtoMapper, userSummarySelect } from '../common/mappers/dto-mapper.service';
import { VisibilityService } from '../privacy/visibility.service';
import { SetAvatarDto, UpdateProfileDto } from './dto/profiles.dto';

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly media: MediaService,
    private readonly mapper: DtoMapper,
    private readonly visibility: VisibilityService,
  ) {}

  async getByUsername(viewerId: string, username: string): Promise<ProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: {
        ...userSummarySelect,
        profile: { select: { fullName: true, avatarMediaId: true, bio: true, website: true } },
        privacySettings: { select: { isPrivate: true } },
        _count: { select: { posts: { where: { isArchived: false } }, followers: true, following: true } },
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const relation = await this.visibility.relation(viewerId, user.id);
    if (relation.blockedByOwner) {
      throw new NotFoundException('User not found');
    }
    return {
      ...this.mapper.user(user),
      bio: user.profile?.bio ?? '',
      website: user.profile?.website ?? null,
      isPrivate: user.privacySettings?.isPrivate ?? false,
      isMe: relation.isSelf,
      canViewContent: this.visibility.canViewContent(relation),
      followStatus: relation.viewerFollows ? 'FOLLOWING' : relation.requested ? 'REQUESTED' : 'NONE',
      followsYou: relation.ownerFollowsViewer,
      blockedByMe: relation.blockedByViewer,
      counts: {
        posts: user._count.posts,
        followers: user._count.followers,
        following: user._count.following,
      },
    };
  }

  async update(userId: string, dto: UpdateProfileDto): Promise<CurrentUser> {
    await this.prisma.profile.update({ where: { userId }, data: dto });
    return this.auth.currentUser(userId);
  }

  async setAvatar(userId: string, dto: SetAvatarDto): Promise<CurrentUser> {
    const [media] = await this.media.claim(userId, [dto.mediaId], 'AVATAR', ['IMAGE']);
    const previous = await this.replaceAvatar(userId, media.id);
    if (previous) {
      await this.media.removeFiles([previous]);
    }
    return this.auth.currentUser(userId);
  }

  async removeAvatar(userId: string): Promise<CurrentUser> {
    const previous = await this.replaceAvatar(userId, null);
    if (previous) {
      await this.media.removeFiles([previous]);
    }
    return this.auth.currentUser(userId);
  }

  private async replaceAvatar(userId: string, mediaId: string | null): Promise<string | null> {
    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.profile.findUniqueOrThrow({
        where: { userId },
        select: { avatar: { select: { id: true, storageKey: true } } },
      });
      await tx.profile.update({ where: { userId }, data: { avatarMediaId: mediaId } });
      if (profile.avatar) {
        await tx.media.delete({ where: { id: profile.avatar.id } });
        return profile.avatar.storageKey;
      }
      return null;
    });
  }
}
