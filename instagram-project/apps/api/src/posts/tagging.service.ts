import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VisibilityService } from '../privacy/visibility.service';
import { extractMentions } from '../common/utils/text';

@Injectable()
export class TaggingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly visibility: VisibilityService,
  ) {}

  hashtagCreates(names: string[]) {
    return names.map((name) => ({
      hashtag: { connectOrCreate: { where: { name }, create: { name } } },
    }));
  }

  async mentionTargets(actorId: string, text: string | null | undefined): Promise<string[]> {
    const usernames = extractMentions(text);
    if (usernames.length === 0) {
      return [];
    }
    const users = await this.prisma.user.findMany({
      where: { username: { in: usernames }, id: { not: actorId }, ...this.visibility.notBlockedUserWhere(actorId) },
      select: { id: true, privacySettings: { select: { allowMentions: true } } },
    });
    const allowed: string[] = [];
    for (const user of users) {
      if (await this.visibility.allows(user.privacySettings?.allowMentions ?? 'EVERYONE', actorId, user.id)) {
        allowed.push(user.id);
      }
    }
    return allowed;
  }
}
