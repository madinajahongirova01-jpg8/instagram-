import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import {
  AUDIO_MAX_BYTES,
  AUDIO_MIME_TYPES,
  IMAGE_MAX_BYTES,
  IMAGE_MIME_TYPES,
  VIDEO_MAX_BYTES,
  VIDEO_MIME_TYPES,
  type MediaDto,
} from '@insta/shared';
import { PrismaService } from '../prisma/prisma.service';
import { DtoMapper } from '../common/mappers/dto-mapper.service';
import { MediaUrlService } from '../common/mappers/media-url.service';
import { Media, MediaKind, MediaPurpose, Prisma } from '../generated/prisma/client';
import { StorageService } from './storage.service';
import { looksLikeAudio, looksLikeVideo } from './file-signature';

export interface UploadedFileLike {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

const ALLOWED_KINDS: Record<MediaPurpose, MediaKind[]> = {
  AVATAR: ['IMAGE'],
  POST: ['IMAGE', 'VIDEO'],
  STORY: ['IMAGE', 'VIDEO'],
  REEL: ['VIDEO', 'IMAGE'],
  MESSAGE: ['IMAGE', 'VIDEO', 'AUDIO'],
};

const IMAGE_BOX: Record<MediaPurpose, { width: number; height: number; fit: 'cover' | 'inside' }> = {
  AVATAR: { width: 320, height: 320, fit: 'cover' },
  POST: { width: 1080, height: 1350, fit: 'inside' },
  STORY: { width: 1080, height: 1920, fit: 'inside' },
  REEL: { width: 720, height: 1280, fit: 'inside' },
  MESSAGE: { width: 1080, height: 1080, fit: 'inside' },
};

const EXTENSIONS: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'audio/webm': 'weba',
  'audio/ogg': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
};

export const unattachedMediaWhere: Prisma.MediaWhereInput = {
  postId: null,
  avatarOf: { is: null },
  story: { is: null },
  reel: { is: null },
  reelThumbnail: { is: null },
  message: { is: null },
};

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly mapper: DtoMapper,
    private readonly urls: MediaUrlService,
  ) {}

  async upload(ownerId: string, purpose: MediaPurpose, file: UploadedFileLike | undefined): Promise<MediaDto> {
    if (!file || file.size === 0) {
      throw new BadRequestException('File is required');
    }
    const kind = this.detectKind(file.mimetype);
    if (!ALLOWED_KINDS[purpose].includes(kind)) {
      throw new UnsupportedMediaTypeException(`${kind} is not allowed for ${purpose}`);
    }
    const prepared = kind === 'IMAGE' ? await this.processImage(file, purpose) : this.checkBinary(file, kind);
    const id = randomUUID();
    const now = new Date();
    const storageKey = `${purpose.toLowerCase()}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${id}.${prepared.ext}`;
    await this.storage.save(storageKey, prepared.buffer);
    try {
      const media = await this.prisma.media.create({
        data: {
          id,
          ownerId,
          kind,
          purpose,
          mimeType: prepared.mimeType,
          sizeBytes: prepared.buffer.length,
          width: prepared.width,
          height: prepared.height,
          storageKey,
        },
      });
      return this.mapper.media(media);
    } catch (error) {
      await this.storage.remove([storageKey]);
      throw error;
    }
  }

  async getOwn(ownerId: string, id: string): Promise<MediaDto> {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) {
      throw new NotFoundException('Media not found');
    }
    if (media.ownerId !== ownerId) {
      throw new ForbiddenException();
    }
    return this.mapper.media(media);
  }

  async resolveSignedFile(id: string, exp: number, sig: string): Promise<{ path: string; mimeType: string }> {
    if (!this.urls.verify(id, exp, sig)) {
      throw new ForbiddenException('Link is invalid or expired');
    }
    const media = await this.prisma.media.findUnique({ where: { id }, select: { storageKey: true, mimeType: true } });
    if (!media) {
      throw new NotFoundException('Media not found');
    }
    return { path: this.storage.absolutePath(media.storageKey), mimeType: media.mimeType };
  }

  async claim(ownerId: string, ids: string[], purpose: MediaPurpose, kinds: MediaKind[]): Promise<Media[]> {
    const unique = [...new Set(ids)];
    if (unique.length !== ids.length) {
      throw new BadRequestException('Duplicate media ids');
    }
    const media = await this.prisma.media.findMany({
      where: { id: { in: unique }, ownerId, purpose, ...unattachedMediaWhere },
    });
    if (media.length !== unique.length) {
      throw new BadRequestException('Media not found, already used, or uploaded for another purpose');
    }
    const wrongKind = media.find((m) => !kinds.includes(m.kind));
    if (wrongKind) {
      throw new BadRequestException(`Media ${wrongKind.id} must be ${kinds.join(' or ')}`);
    }
    return unique.map((id) => media.find((m) => m.id === id) as Media);
  }

  async deleteUnattached(ownerId: string, id: string): Promise<void> {
    const media = await this.prisma.media.findFirst({ where: { id, ownerId, ...unattachedMediaWhere } });
    if (!media) {
      throw new NotFoundException('Media not found or already attached');
    }
    await this.prisma.media.delete({ where: { id } });
    await this.storage.remove([media.storageKey]);
  }

  async removeFiles(keys: string[]): Promise<void> {
    await this.storage.remove(keys);
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  async cleanupOrphans(): Promise<number> {
    const threshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const orphans = await this.prisma.media.findMany({
      where: { createdAt: { lt: threshold }, ...unattachedMediaWhere },
      select: { id: true, storageKey: true },
      take: 500,
    });
    if (orphans.length === 0) {
      return 0;
    }
    await this.prisma.media.deleteMany({ where: { id: { in: orphans.map((o) => o.id) } } });
    await this.storage.remove(orphans.map((o) => o.storageKey));
    this.logger.log({ count: orphans.length }, 'Orphan media removed');
    return orphans.length;
  }

  private detectKind(mimeType: string): MediaKind {
    if ((IMAGE_MIME_TYPES as readonly string[]).includes(mimeType)) {
      return 'IMAGE';
    }
    if ((VIDEO_MIME_TYPES as readonly string[]).includes(mimeType)) {
      return 'VIDEO';
    }
    if ((AUDIO_MIME_TYPES as readonly string[]).includes(mimeType)) {
      return 'AUDIO';
    }
    throw new UnsupportedMediaTypeException('Unsupported file type');
  }

  private async processImage(file: UploadedFileLike, purpose: MediaPurpose) {
    if (file.size > IMAGE_MAX_BYTES) {
      throw new PayloadTooLargeException('Image is too large');
    }
    const box = IMAGE_BOX[purpose];
    try {
      const { data, info } = await sharp(file.buffer, { limitInputPixels: 50_000_000 })
        .rotate()
        .resize(box.width, box.height, { fit: box.fit, withoutEnlargement: box.fit === 'inside' })
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer({ resolveWithObject: true });
      return { buffer: data, mimeType: 'image/jpeg', ext: 'jpg', width: info.width, height: info.height };
    } catch {
      throw new UnsupportedMediaTypeException('File is not a valid image');
    }
  }

  private checkBinary(file: UploadedFileLike, kind: MediaKind) {
    const max = kind === 'VIDEO' ? VIDEO_MAX_BYTES : AUDIO_MAX_BYTES;
    if (file.size > max) {
      throw new PayloadTooLargeException(`${kind === 'VIDEO' ? 'Video' : 'Audio'} is too large`);
    }
    const valid = kind === 'VIDEO' ? looksLikeVideo(file.buffer, file.mimetype) : looksLikeAudio(file.buffer, file.mimetype);
    if (!valid) {
      throw new UnsupportedMediaTypeException('File content does not match its type');
    }
    return { buffer: file.buffer, mimeType: file.mimetype, ext: EXTENSIONS[file.mimetype], width: null, height: null };
  }
}
