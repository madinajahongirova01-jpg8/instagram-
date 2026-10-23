import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { NotificationSettings } from '../generated/prisma/client';
import { UpdateNotificationSettingsDto } from './dto/settings.dto';
import { SettingsService } from './settings.service';

@ApiTags('Settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('notifications')
  @ApiOperation({ summary: 'Какие уведомления получать' })
  get(@CurrentUser() user: AuthUser): Promise<NotificationSettings> {
    return this.settings.getNotificationSettings(user.id);
  }

  @Patch('notifications')
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateNotificationSettingsDto): Promise<NotificationSettings> {
    return this.settings.updateNotificationSettings(user.id, dto);
  }
}
