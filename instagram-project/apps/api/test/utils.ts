import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import sharp from 'sharp';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { MailService } from '../src/mail/mail.service';
import { PrismaService } from '../src/prisma/prisma.service';

export interface SentMail {
  to: string;
  kind: 'verify' | 'reset' | 'notice';
  token?: string;
  text?: string;
}

export class FakeMailService {
  readonly webOrigin = 'http://localhost:3000';
  readonly sent: SentMail[] = [];

  async sendEmailVerification(to: string, token: string): Promise<void> {
    this.sent.push({ to, kind: 'verify', token });
  }

  async sendPasswordReset(to: string, token: string): Promise<void> {
    this.sent.push({ to, kind: 'reset', token });
  }

  async sendSecurityNotice(to: string, text: string): Promise<void> {
    this.sent.push({ to, kind: 'notice', text });
  }

  last(to: string, kind: SentMail['kind']): SentMail | undefined {
    return [...this.sent].reverse().find((m) => m.to === to && m.kind === kind);
  }
}

export interface TestContext {
  app: NestExpressApplication;
  http: App;
  mail: FakeMailService;
  prisma: PrismaService;
}

export async function createTestApp(): Promise<TestContext> {
  const mail = new FakeMailService();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MailService)
    .useValue(mail)
    .compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false });
  configureApp(app);
  await app.init();
  const prisma = app.get(PrismaService);
  return { app, http: app.getHttpServer() as App, mail, prisma };
}

export async function resetDatabase(prisma: PrismaService): Promise<void> {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length > 0) {
    const list = tables.map((t) => `"public"."${t.tablename}"`).join(', ');
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} CASCADE`);
  }
}

let counter = 0;

export interface TestUser {
  id: string;
  username: string;
  email: string;
  password: string;
  token: string;
  cookie: string;
}

export function refreshCookieFrom(res: request.Response): string {
  const raw = res.headers['set-cookie'] as unknown as string[] | undefined;
  const cookie = raw?.find((c) => c.startsWith('rt='));
  if (!cookie) {
    throw new Error('Refresh cookie was not set');
  }
  return cookie.split(';')[0];
}

export async function registerUser(http: App, prefix = 'user'): Promise<TestUser> {
  counter += 1;
  const username = `${prefix}${Date.now().toString(36)}${counter}`.toLowerCase().slice(0, 30);
  const email = `${username}@example.com`;
  const password = 'Secret123';
  const res = await request(http)
    .post('/api/auth/register')
    .send({ email, username, fullName: `Test ${prefix}`, password })
    .expect(201);
  return {
    id: res.body.user.id,
    username,
    email,
    password,
    token: res.body.accessToken,
    cookie: refreshCookieFrom(res),
  };
}

export function auth(user: TestUser): [string, string] {
  return ['Authorization', `Bearer ${user.token}`];
}

export async function pngBuffer(color = '#e1306c', size = 64): Promise<Buffer> {
  return sharp({ create: { width: size, height: size, channels: 3, background: color } }).png().toBuffer();
}

export function fakeMp4(): Buffer {
  const header = Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x02, 0x00]);
  return Buffer.concat([header, Buffer.alloc(256, 1)]);
}

export async function uploadMedia(
  http: App,
  user: TestUser,
  purpose: string,
  file: Buffer,
  filename: string,
  contentType: string,
): Promise<string> {
  const res = await request(http)
    .post('/api/media')
    .set(...auth(user))
    .field('purpose', purpose)
    .attach('file', file, { filename, contentType })
    .expect(201);
  return res.body.id as string;
}
