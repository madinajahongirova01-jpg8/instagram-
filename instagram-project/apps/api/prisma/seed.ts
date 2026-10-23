import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DemoSeeder } from './seed/demo-seed';

const FORBIDDEN_DATABASES = ['instagram'];

async function main(): Promise<void> {
  const reset = process.argv.includes('--reset');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  try {
    const name = new URL(app.get(ConfigService).getOrThrow<string>('DATABASE_URL')).pathname.replace(/^\//, '');
    if (FORBIDDEN_DATABASES.includes(name)) {
      throw new Error(`Seed refuses to touch database "${name}"`);
    }
    console.log(`База: ${name}`);
    const seeder = new DemoSeeder(app, (message) => console.log(message));
    if (reset) {
      await seeder.reset();
    } else {
      await seeder.seed();
    }
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
