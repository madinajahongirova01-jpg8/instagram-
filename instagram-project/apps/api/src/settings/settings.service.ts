import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationSettings } from '../generated/prisma/client';
import { UpdateNotificationSettingsDto } from './dto/settings.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  getNotificationSettings(userId: string): Promise<NotificationSettings> {
    return this.prisma.notificationSettings.upsert({ where: { userId }, update: {}, create: { userId } });
  }

  updateNotificationSettings(userId: string, dto: UpdateNotificationSettingsDto): Promise<NotificationSettings> {
    return this.prisma.notificationSettings.upsert({
      where: { userId },
      update: dto,
      create: { userId, ...dto },
    });
  }
}
