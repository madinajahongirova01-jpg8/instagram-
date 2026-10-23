import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly root: string;

  constructor(config: ConfigService) {
    this.root = resolve(config.getOrThrow<string>('STORAGE_DIR'));
  }

  absolutePath(key: string): string {
    const full = resolve(join(this.root, key));
    if (!full.startsWith(this.root + sep)) {
      throw new Error('Invalid storage key');
    }
    return full;
  }

  async save(key: string, data: Buffer): Promise<void> {
    const full = this.absolutePath(key);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, data, { flag: 'wx' });
  }

  async remove(keys: string[]): Promise<void> {
    await Promise.all(
      keys.map(async (key) => {
        try {
          await rm(this.absolutePath(key), { force: true });
        } catch (error) {
          this.logger.warn({ key, err: (error as Error).message }, 'Failed to delete stored file');
        }
      }),
    );
  }
}
