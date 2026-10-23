import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hmacSha256, safeEqual } from '../utils/crypto';

const URL_TTL_SECONDS = 60 * 60;

@Injectable()
export class MediaUrlService {
  private readonly secret: string;

  constructor(config: ConfigService) {
    this.secret = config.getOrThrow<string>('MEDIA_URL_SECRET');
  }

  sign(mediaId: string, now = Date.now()): string {
    const nowSeconds = Math.floor(now / 1000);
    const expires = (Math.floor(nowSeconds / URL_TTL_SECONDS) + 2) * URL_TTL_SECONDS;
    const signature = hmacSha256(this.secret, `${mediaId}.${expires}`);
    return `/api/media/${mediaId}/file?exp=${expires}&sig=${signature}`;
  }

  verify(mediaId: string, expires: number, signature: string, now = Date.now()): boolean {
    if (!Number.isInteger(expires) || expires * 1000 < now) {
      return false;
    }
    const expected = hmacSha256(this.secret, `${mediaId}.${expires}`);
    return safeEqual(expected, signature);
  }
}
