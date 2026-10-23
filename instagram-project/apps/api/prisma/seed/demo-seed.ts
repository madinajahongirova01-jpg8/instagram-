import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import type { INestApplicationContext } from '@nestjs/common';
import { VIDEO_MAX_BYTES } from '@insta/shared';
import { PrismaService } from '../../src/prisma/prisma.service';
import { MediaService } from '../../src/media/media.service';
import { PasswordService } from '../../src/auth/password.service';
import { ProfilesService } from '../../src/profiles/profiles.service';
import { PrivacyService } from '../../src/privacy/privacy.service';
import { FollowsService } from '../../src/follows/follows.service';
import { PostsService } from '../../src/posts/posts.service';
import { ReelsService } from '../../src/reels/reels.service';
import { StoriesService } from '../../src/stories/stories.service';
import { LikesService } from '../../src/likes/likes.service';
import { CommentsService } from '../../src/comments/comments.service';
import type { MediaPurpose } from '../../src/generated/prisma/client';
import {
  COMMENTS,
  DEMO_EMAIL_DOMAIN,
  DEMO_PASSWORD,
  DEMO_USERS,
  POST_CAPTIONS,
  POST_LOCATIONS,
  POST_SIZES,
  REEL_CAPTIONS,
  STORY_CAPTIONS,
  TEST_USERNAMES,
  type DemoUser,
} from './demo-data';
import { placeholderAvatar, placeholderLandscape } from './placeholder-images';

export const SEED_MEDIA_DIR = resolve(__dirname, '..', 'seed-media');

const IMAGE_TYPES: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
const VIDEO_TYPES: Record<string, string> = { '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime' };
const PLACEHOLDER_POSTS = 8;

interface SeedFile {
  name: string;
  path: string;
  mimetype: string;
}

interface Seeded {
  id: string;
  username: string;
  demo: DemoUser;
}

function listFiles(folder: string, types: Record<string, string>): SeedFile[] {
  const dir = join(SEED_MEDIA_DIR, folder);
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir)
    .filter((name) => types[extname(name).toLowerCase()] && statSync(join(dir, name)).isFile())
    .sort()
    .map((name) => ({ name, path: join(dir, name), mimetype: types[extname(name).toLowerCase()] }));
}

function pick<T>(items: T[], index: number): T {
  return items[index % items.length];
}

export class DemoSeeder {
  private readonly prisma: PrismaService;
  private readonly media: MediaService;

  constructor(
    private readonly app: INestApplicationContext,
    private readonly log: (message: string) => void,
  ) {
    this.prisma = app.get(PrismaService);
    this.media = app.get(MediaService);
  }

  async seed(): Promise<void> {
    const images = listFiles('images', IMAGE_TYPES);
    const avatars = listFiles('avatars', IMAGE_TYPES);
    const videos = listFiles('videos', VIDEO_TYPES);
    this.log(`Папка: ${SEED_MEDIA_DIR}`);
    this.log(`Найдено: фото ${images.length}, аватары ${avatars.length}, видео ${videos.length}`);

    const users = await this.ensureUsers(avatars);
    await this.ensureFollows(users);
    const postIds = await this.ensurePosts(users, images);
    const reelIds = await this.ensureReels(users, videos);
    await this.ensureStories(users, images, videos);
    await this.ensureEngagement(users, postIds, reelIds);
    this.log(`Готово: пользователи ${users.length}, посты ${postIds.length}, reels ${reelIds.length}`);
    this.log(`Вход: любой логин из README, пароль ${DEMO_PASSWORD}`);
  }

  async reset(): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: { email: { endsWith: `@${DEMO_EMAIL_DOMAIN}` } },
      select: { id: true, username: true },
    });
    if (users.length === 0) {
      this.log('Демо-данных нет — удалять нечего.');
      return;
    }
    const files = await this.prisma.media.findMany({ where: { ownerId: { in: users.map((u) => u.id) } }, select: { storageKey: true } });
    await this.prisma.user.deleteMany({ where: { id: { in: users.map((u) => u.id) } } });
    await this.media.removeFiles(files.map((f) => f.storageKey));
    this.log(`Удалено демо-пользователей: ${users.length} (${users.map((u) => u.username).join(', ')}), файлов: ${files.length}`);
  }

  private async upload(ownerId: string, purpose: MediaPurpose, file: SeedFile | { buffer: Buffer; mimetype: string }): Promise<string> {
    const buffer = 'buffer' in file ? file.buffer : readFileSync(file.path);
    const media = await this.media.upload(ownerId, purpose, { buffer, mimetype: file.mimetype, size: buffer.length });
    return media.id;
  }

  private async ensureUsers(avatars: SeedFile[]): Promise<Seeded[]> {
    const passwords = this.app.get(PasswordService);
    const profiles = this.app.get(ProfilesService);
    const privacy = this.app.get(PrivacyService);
    const result: Seeded[] = [];
    for (const [index, demo] of DEMO_USERS.entries()) {
      const email = `${demo.username}@${DEMO_EMAIL_DOMAIN}`;
      let user = await this.prisma.user.findUnique({ where: { email }, select: { id: true, profile: { select: { avatarMediaId: true } } } });
      if (!user) {
        const created = await this.prisma.user.create({
          data: {
            email,
            username: demo.username,
            passwordHash: await passwords.hash(DEMO_PASSWORD),
            emailVerifiedAt: new Date(),
            isVerified: demo.isVerified ?? false,
            profile: { create: { fullName: demo.fullName } },
            privacySettings: { create: {} },
            notificationSettings: { create: {} },
          },
          select: { id: true },
        });
        user = { id: created.id, profile: { avatarMediaId: null } };
        this.log(`+ пользователь ${demo.username}`);
      }
      await profiles.update(user.id, { fullName: demo.fullName, bio: demo.bio, website: demo.website ?? null });
      await privacy.updateSettings(user.id, { isPrivate: demo.isPrivate ?? false });
      if (!user.profile?.avatarMediaId) {
        const avatar = avatars[index]
          ? avatars[index]
          : { buffer: await placeholderAvatar(demo.colors), mimetype: 'image/png' };
        const mediaId = await this.upload(user.id, 'AVATAR', avatar);
        await profiles.setAvatar(user.id, { mediaId });
      }
      result.push({ id: user.id, username: demo.username, demo });
    }
    return result;
  }

  private async ensureFollows(users: Seeded[]): Promise<void> {
    const follows = this.app.get(FollowsService);
    const followSafe = async (followerId: string, targetId: string) => {
      const exists = await this.prisma.follow.findUnique({
        where: { followerId_followingId: { followerId, followingId: targetId } },
        select: { followerId: true },
      });
      if (!exists) {
        await follows.follow(followerId, targetId);
      }
    };
    for (const [i, a] of users.entries()) {
      for (const [j, b] of users.entries()) {
        if (i !== j && (i + j) % 4 !== 3) {
          await followSafe(a.id, b.id);
        }
      }
    }
    const testers = await this.prisma.user.findMany({ where: { username: { in: TEST_USERNAMES } }, select: { id: true, username: true } });
    for (const tester of testers) {
      for (const demo of users) {
        await followSafe(demo.id, tester.id);
        await followSafe(tester.id, demo.id);
      }
    }
    const privateUser = users.find((u) => u.demo.isPrivate);
    if (privateUser) {
      const pending = await this.prisma.followRequest.findMany({
        where: { targetId: privateUser.id, status: 'PENDING', requester: { username: { not: TEST_USERNAMES[1] } } },
        select: { id: true },
      });
      for (const request of pending) {
        await follows.accept(privateUser.id, request.id);
      }
    }
    this.log(`Подписки готовы${testers.length ? ` (включая ${testers.map((t) => t.username).join(', ')})` : ''}`);
  }

  private async ensurePosts(users: Seeded[], images: SeedFile[]): Promise<string[]> {
    const posts = this.app.get(PostsService);
    const ids: string[] = [];
    const usePlaceholders = images.length === 0;
    if (usePlaceholders) {
      this.log('Фото не найдены — для постов будут нарисованы картинки-пейзажи (без текста).');
    }
    let cursor = 0;
    const total = usePlaceholders ? PLACEHOLDER_POSTS : images.length;
    for (let index = 0; cursor < total; index++) {
      const size = Math.min(pick(POST_SIZES, index), total - cursor);
      const author = pick(users, index);
      const caption = pick(POST_CAPTIONS, index) + (index >= POST_CAPTIONS.length ? ` · ${Math.floor(index / POST_CAPTIONS.length) + 1}` : '');
      const existing = await this.prisma.post.findFirst({ where: { authorId: author.id, caption }, select: { id: true } });
      if (existing) {
        ids.push(existing.id);
        cursor += usePlaceholders ? 1 : size;
        continue;
      }
      const mediaIds: string[] = [];
      if (usePlaceholders) {
        mediaIds.push(await this.upload(author.id, 'POST', { buffer: await placeholderLandscape(index), mimetype: 'image/jpeg' }));
        cursor += 1;
      } else {
        for (const file of images.slice(cursor, cursor + size)) {
          mediaIds.push(await this.upload(author.id, 'POST', file));
        }
        cursor += size;
      }
      const post = await posts.create(author.id, { mediaIds, caption, location: pick(POST_LOCATIONS, index) });
      ids.push(post.id);
      this.log(`+ пост ${author.username} (${mediaIds.length} фото)`);
    }
    return ids;
  }

  private async ensureReels(users: Seeded[], videos: SeedFile[]): Promise<string[]> {
    if (videos.length === 0) {
      this.log(`Видео не найдены — reels не созданы. Положите .mp4 / .webm / .mov в ${join(SEED_MEDIA_DIR, 'videos')} и запустите seed ещё раз.`);
      return [];
    }
    const reels = this.app.get(ReelsService);
    const ids: string[] = [];
    for (const [index, file] of videos.entries()) {
      if (statSync(file.path).size > VIDEO_MAX_BYTES) {
        this.log(`! ${file.name} больше 100 МБ — пропущено`);
        continue;
      }
      const author = pick(users.filter((u) => !u.demo.isPrivate), index);
      const caption = `${pick(REEL_CAPTIONS, index)} · ${index + 1}`;
      const existing = await this.prisma.reel.findFirst({ where: { authorId: author.id, caption }, select: { id: true } });
      if (existing) {
        ids.push(existing.id);
        continue;
      }
      try {
        const videoMediaId = await this.upload(author.id, 'REEL', file);
        const reel = await reels.create(author.id, { videoMediaId, caption });
        ids.push(reel.id);
        this.log(`+ reel ${author.username} ← ${file.name}`);
      } catch (error) {
        this.log(`! ${file.name} не принят сервером: ${(error as Error).message}`);
      }
    }
    return ids;
  }

  private async ensureStories(users: Seeded[], images: SeedFile[], videos: SeedFile[]): Promise<void> {
    const stories = this.app.get(StoriesService);
    const authors = users.slice(0, 4);
    for (const [index, author] of authors.entries()) {
      const active = await this.prisma.story.count({ where: { authorId: author.id, expiresAt: { gt: new Date() } } });
      if (active > 0) {
        continue;
      }
      const video = index === 1 ? videos[0] : undefined;
      const source = video
        ? video
        : images.length > 0
          ? pick(images, images.length - 1 - index)
          : { buffer: await placeholderLandscape(index + 3, 1080, 1920), mimetype: 'image/jpeg' };
      try {
        const mediaId = await this.upload(author.id, 'STORY', source);
        await stories.create(author.id, { mediaId, caption: pick(STORY_CAPTIONS, index), audience: 'EVERYONE' });
        this.log(`+ story ${author.username}`);
      } catch (error) {
        this.log(`! story ${author.username}: ${(error as Error).message}`);
      }
    }
  }

  private async ensureEngagement(users: Seeded[], postIds: string[], reelIds: string[]): Promise<void> {
    const likes = this.app.get(LikesService);
    const comments = this.app.get(CommentsService);
    const targets = [...postIds.map((id) => ({ postId: id })), ...reelIds.map((id) => ({ reelId: id }))];
    for (const [index, target] of targets.entries()) {
      for (const [j, user] of users.entries()) {
        if ((index + j) % 3 === 0) {
          continue;
        }
        await likes.like(user.id, target).catch(() => undefined);
      }
      for (let k = 0; k < 2; k++) {
        const user = pick(users, index + k + 1);
        const content = pick(COMMENTS, index * 2 + k);
        const where = 'postId' in target ? { postId: target.postId } : { reelId: target.reelId };
        const exists = await this.prisma.comment.findFirst({ where: { ...where, authorId: user.id, content }, select: { id: true } });
        if (!exists) {
          await comments.create(user.id, target, { content }).catch(() => undefined);
        }
      }
    }
    this.log(`Лайки и комментарии готовы (${targets.length} публикаций)`);
  }
}
