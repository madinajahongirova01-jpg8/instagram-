import { Injectable } from '@nestjs/common';
import type { MediaDto, UserSummary } from '@insta/shared';
import { Prisma } from '../../generated/prisma/client';
import { MediaUrlService } from './media-url.service';

export const userSummarySelect = {
  id: true,
  username: true,
  isVerified: true,
  profile: { select: { fullName: true, avatarMediaId: true } },
} satisfies Prisma.UserSelect;

export type UserSummaryRow = Prisma.UserGetPayload<{ select: typeof userSummarySelect }>;

export const mediaSelect = {
  id: true,
  kind: true,
  mimeType: true,
  width: true,
  height: true,
} satisfies Prisma.MediaSelect;

export type MediaRow = Prisma.MediaGetPayload<{ select: typeof mediaSelect }>;

@Injectable()
export class DtoMapper {
  constructor(private readonly urls: MediaUrlService) {}

  user(row: UserSummaryRow): UserSummary {
    return {
      id: row.id,
      username: row.username,
      fullName: row.profile?.fullName ?? row.username,
      avatarUrl: row.profile?.avatarMediaId ? this.urls.sign(row.profile.avatarMediaId) : null,
      isVerified: row.isVerified,
    };
  }

  media(row: MediaRow): MediaDto {
    return {
      id: row.id,
      kind: row.kind,
      mimeType: row.mimeType,
      width: row.width,
      height: row.height,
      url: this.urls.sign(row.id),
    };
  }
}
