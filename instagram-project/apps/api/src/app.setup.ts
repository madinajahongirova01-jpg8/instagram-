import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { SocketIoAdapter } from './realtime/socket-io.adapter';

export const API_PREFIX = 'api';

export function configureApp(app: NestExpressApplication): void {
  const config = app.get(ConfigService);
  const trustProxy = config.getOrThrow<string>('TRUST_PROXY');
  app.set('trust proxy', trustProxy === 'false' ? false : trustProxy);
  app.disable('x-powered-by');
  app.setGlobalPrefix(API_PREFIX);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(cookieParser());
  app.enableCors({ origin: config.getOrThrow<string>('WEB_ORIGIN'), credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      stopAtFirstError: false,
    }),
  );
  app.useWebSocketAdapter(new SocketIoAdapter(app, config.getOrThrow<string>('WEB_ORIGIN')));
  app.enableShutdownHooks();
}

export function setupSwagger(app: INestApplication): void {
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Instagram-like API')
      .setDescription('REST API на NestJS. Access token — в заголовке Authorization, refresh token — в httpOnly cookie "rt".')
      .setVersion('0.1.0')
      .addBearerAuth()
      .addCookieAuth('rt')
      .build(),
  );
  SwaggerModule.setup(`${API_PREFIX}/docs`, app, document, { jsonDocumentUrl: `${API_PREFIX}/docs-json` });
}
