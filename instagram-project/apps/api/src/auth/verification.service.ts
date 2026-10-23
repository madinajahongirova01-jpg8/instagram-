import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { generateToken, sha256 } from '../common/utils/crypto';
import { TokenType, VerificationToken } from '../generated/prisma/client';

const TTL_MS: Record<TokenType, number> = {
  EMAIL_VERIFICATION: 24 * 60 * 60 * 1000,
  PASSWORD_RESET: 60 * 60 * 1000,
};

@Injectable()
export class VerificationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, type: TokenType, email: string): Promise<string> {
    const raw = generateToken(32);
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.verificationToken.updateMany({
        where: { userId, type, usedAt: null },
        data: { usedAt: now },
      }),
      this.prisma.verificationToken.create({
        data: {
          userId,
          type,
          email,
          tokenHash: sha256(raw),
          expiresAt: new Date(now.getTime() + TTL_MS[type]),
        },
      }),
    ]);
    return raw;
  }

  async consume(raw: string, type: TokenType): Promise<VerificationToken> {
    const now = new Date();
    const token = await this.prisma.verificationToken.findUnique({ where: { tokenHash: sha256(raw) } });
    if (!token || token.type !== type || token.usedAt || token.expiresAt <= now) {
      throw new BadRequestException('Token is invalid or expired');
    }
    const claimed = await this.prisma.verificationToken.updateMany({
      where: { id: token.id, usedAt: null },
      data: { usedAt: now },
    });
    if (claimed.count !== 1) {
      throw new BadRequestException('Token is invalid or expired');
    }
    return token;
  }
}
