import { UsersService } from './users.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { AuthService } from '../auth/auth.service';
import type { VerificationService } from '../auth/verification.service';
import type { MailService } from '../mail/mail.service';
import type { MediaService } from '../media/media.service';
import type { DtoMapper, UserSummaryRow } from '../common/mappers/dto-mapper.service';
import type { RealtimeService } from '../realtime/realtime.service';
import { VisibilityService } from '../privacy/visibility.service';

function contactRow(id: string, showOnlineStatus: boolean | null, lastSeenAt: Date | null) {
  return {
    user: {
      id,
      username: id,
      isVerified: false,
      profile: null,
      lastSeenAt,
      privacySettings: showOnlineStatus === null ? null : { showOnlineStatus },
    },
  };
}

describe('UsersService.contacts', () => {
  const seen = new Date('2026-10-23T10:00:00.000Z');
  const findMany = jest.fn();
  const online = new Set(['visible', 'hidden']);

  const service = new UsersService(
    { conversation: { findMany } } as unknown as PrismaService,
    {} as AuthService,
    {} as VerificationService,
    {} as MailService,
    {} as MediaService,
    { user: (row: UserSummaryRow) => ({ id: row.id, username: row.username, fullName: row.username, avatarUrl: null, isVerified: false }) } as DtoMapper,
    new VisibilityService({} as PrismaService),
    { isOnline: (id: string) => online.has(id) } as RealtimeService,
  );

  beforeEach(() => {
    findMany.mockResolvedValue([
      { participants: [contactRow('visible', true, seen)] },
      { participants: [contactRow('hidden', false, seen)] },
      { participants: [contactRow('offline', null, seen)] },
    ]);
  });

  it('shows online status and last seen time when the contact allows it', async () => {
    const [visible, , offline] = await service.contacts('me');
    expect(visible).toMatchObject({ id: 'visible', online: true, lastSeenAt: seen.toISOString() });
    expect(offline).toMatchObject({ id: 'offline', online: false, lastSeenAt: seen.toISOString() });
  });

  it('hides presence of contacts with showOnlineStatus = false', async () => {
    const [, hidden] = await service.contacts('me');
    expect(hidden).toMatchObject({ id: 'hidden', online: false, lastSeenAt: null });
  });

  it('asks only for direct conversations of the current user, excluding blocked people', async () => {
    await service.contacts('me');
    const args = findMany.mock.calls[0][0];
    expect(args.where).toEqual({ isGroup: false, participants: { some: { userId: 'me' } } });
    expect(args.select.participants.where).toEqual({
      userId: { not: 'me' },
      user: { blocking: { none: { blockedId: 'me' } }, blockedBy: { none: { blockerId: 'me' } } },
    });
  });
});
