import { Module, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { MailModule } from './mail/mail.module';
import { RealtimeCoreModule } from './realtime/realtime-core.module';
import { RealtimeModule } from './realtime/realtime.module';
import { SessionsModule } from './sessions/sessions.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProfilesModule } from './profiles/profiles.module';
import { PrivacyModule } from './privacy/privacy.module';
import { SettingsModule } from './settings/settings.module';
import { MediaModule } from './media/media.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PostsModule } from './posts/posts.module';
import { CommentsModule } from './comments/comments.module';
import { LikesModule } from './likes/likes.module';
import { FollowsModule } from './follows/follows.module';
import { StoriesModule } from './stories/stories.module';
import { ReelsModule } from './reels/reels.module';
import { FeedModule } from './feed/feed.module';
import { SearchModule } from './search/search.module';
import { MessagesModule } from './messages/messages.module';
import { HealthController } from './health/health.controller';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv, cache: true }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        forRoutes: [{ path: '{*path}', method: RequestMethod.ALL }],
        pinoHttp: {
          level: config.get<string>('LOG_LEVEL'),
          transport:
            config.get<string>('NODE_ENV') === 'development'
              ? { target: 'pino-pretty', options: { singleLine: true, colorize: true } }
              : undefined,
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'res.headers["set-cookie"]',
              'req.query.sig',
              '*.password',
              '*.newPassword',
              '*.currentPassword',
              '*.token',
              '*.accessToken',
              '*.refreshToken',
            ],
            censor: '[REDACTED]',
          },
          customProps: () => ({ service: 'insta-api' }),
          autoLogging: { ignore: (req) => req.url === '/api/health' },
          serializers: {
            req: (req: { id: string; method: string; url: string }) => ({
              id: req.id,
              method: req.method,
              url: req.url.replace(/([?&](sig|exp))=[^&]*/g, '$1=[REDACTED]'),
            }),
          },
        },
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [{ name: 'default', ttl: 60_000, limit: Number(config.get('THROTTLE_LIMIT')) }],
        skipIf: () => config.get<boolean>('THROTTLE_ENABLED') === false,
      }),
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    CommonModule,
    MailModule,
    RealtimeCoreModule,
    PrivacyModule,
    NotificationsModule,
    MediaModule,
    SessionsModule,
    AuthModule,
    UsersModule,
    ProfilesModule,
    SettingsModule,
    PostsModule,
    CommentsModule,
    LikesModule,
    FollowsModule,
    StoriesModule,
    ReelsModule,
    FeedModule,
    SearchModule,
    MessagesModule,
    RealtimeModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
  ],
})
export class AppModule {}
