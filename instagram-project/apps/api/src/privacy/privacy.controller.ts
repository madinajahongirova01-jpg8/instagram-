import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Paginated, UserSummary } from '@insta/shared';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/pagination/pagination';
import { CreateReportDto, UpdatePrivacySettingsDto } from './dto/privacy.dto';
import { PrivacyService } from './privacy.service';
import { PrivacySettings } from '../generated/prisma/client';

@ApiTags('Privacy')
@ApiBearerAuth()
@Controller()
export class PrivacyController {
  constructor(private readonly privacy: PrivacyService) {}

  @Get('privacy/settings')
  getSettings(@CurrentUser() user: AuthUser): Promise<PrivacySettings> {
    return this.privacy.getSettings(user.id);
  }

  @Patch('privacy/settings')
  @ApiOperation({ summary: 'Изменить приватность. При переходе в публичный аккаунт все запросы на подписку принимаются' })
  updateSettings(@CurrentUser() user: AuthUser, @Body() dto: UpdatePrivacySettingsDto): Promise<PrivacySettings> {
    return this.privacy.updateSettings(user.id, dto);
  }

  @Get('privacy/blocks')
  listBlocked(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto): Promise<Paginated<UserSummary>> {
    return this.privacy.listBlocked(user.id, query);
  }

  @Post('privacy/blocks/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Заблокировать пользователя (подписки в обе стороны удаляются)' })
  async block(@CurrentUser() user: AuthUser, @Param('userId', ParseUUIDPipe) targetId: string): Promise<void> {
    await this.privacy.block(user.id, targetId);
  }

  @Delete('privacy/blocks/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unblock(@CurrentUser() user: AuthUser, @Param('userId', ParseUUIDPipe) targetId: string): Promise<void> {
    await this.privacy.unblock(user.id, targetId);
  }

  @Get('privacy/close-friends')
  @ApiOperation({ summary: 'Мои «Близкие друзья» (видят stories с audience=CLOSE_FRIENDS)' })
  closeFriends(@CurrentUser() user: AuthUser): Promise<UserSummary[]> {
    return this.privacy.listPeople(user.id, 'closeFriends');
  }

  @Put('privacy/close-friends/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async addCloseFriend(@CurrentUser() user: AuthUser, @Param('userId', ParseUUIDPipe) targetId: string): Promise<void> {
    await this.privacy.addPerson(user.id, targetId, 'closeFriends');
  }

  @Delete('privacy/close-friends/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeCloseFriend(@CurrentUser() user: AuthUser, @Param('userId', ParseUUIDPipe) targetId: string): Promise<void> {
    await this.privacy.removePerson(user.id, targetId, 'closeFriends');
  }

  @Get('privacy/story-hidden')
  @ApiOperation({ summary: 'Люди, от которых скрыты мои stories' })
  storyHidden(@CurrentUser() user: AuthUser): Promise<UserSummary[]> {
    return this.privacy.listPeople(user.id, 'storyHidden');
  }

  @Put('privacy/story-hidden/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Скрыть мои stories от пользователя' })
  async hideStories(@CurrentUser() user: AuthUser, @Param('userId', ParseUUIDPipe) targetId: string): Promise<void> {
    await this.privacy.addPerson(user.id, targetId, 'storyHidden');
  }

  @Delete('privacy/story-hidden/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unhideStories(@CurrentUser() user: AuthUser, @Param('userId', ParseUUIDPipe) targetId: string): Promise<void> {
    await this.privacy.removePerson(user.id, targetId, 'storyHidden');
  }

  @Post('reports')
  @ApiOperation({ summary: 'Жалоба на пользователя, пост, комментарий, story, reel или сообщение' })
  report(@CurrentUser() user: AuthUser, @Body() dto: CreateReportDto): Promise<{ id: string }> {
    return this.privacy.report(user.id, dto);
  }
}
