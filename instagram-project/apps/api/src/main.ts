import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { configureApp, setupSwagger } from './app.setup';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  configureApp(app);
  const config = app.get(ConfigService);
  if (config.get<string>('NODE_ENV') !== 'production') {
    setupSwagger(app);
  }
  const port = config.getOrThrow<number>('PORT');
  await app.listen(port);
  app.get(Logger).log(`API is running on http://localhost:${port}/api (docs: /api/docs)`);
}

void bootstrap();
