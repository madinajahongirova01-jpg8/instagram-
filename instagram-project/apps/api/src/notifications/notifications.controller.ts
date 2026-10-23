import { Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { NotificationDto, Paginated } from '@insta/shared';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/pagination/pagination';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Уведомления текущего пользователя (новые сверху)' })
  list(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto): Promise<Paginated<NotificationDto>> {
    return this.notifications.list(user.id, query);
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: AuthUser): Promise<{ count: number }> {
    return { count: await this.notifications.unreadCount(user.id) };
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  async readAll(@CurrentUser() user: AuthUser): Promise<{ updated: number }> {
    return { updated: await this.notifications.markAllRead(user.id) };
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async read(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.notifications.markRead(user.id, id);
  }
}
