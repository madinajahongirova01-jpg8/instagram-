import { Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FollowStatus, Paginated } from '@insta/shared';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/pagination/pagination';
import { FollowListItem, FollowRequestDto, FollowsService } from './follows.service';

@ApiTags('Follows')
@ApiBearerAuth()
@Controller()
export class FollowsController {
  constructor(private readonly follows: FollowsService) {}

  @Post('follows/:userId')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Подписаться. Для приватного аккаунта создаётся запрос (status=REQUESTED)' })
  follow(@CurrentUser() user: AuthUser, @Param('userId', ParseUUIDPipe) userId: string): Promise<{ status: FollowStatus }> {
    return this.follows.follow(user.id, userId);
  }

  @Delete('follows/:userId')
  @ApiOperation({ summary: 'Отписаться или отменить запрос' })
  unfollow(@CurrentUser() user: AuthUser, @Param('userId', ParseUUIDPipe) userId: string): Promise<{ status: FollowStatus }> {
    return this.follows.unfollow(user.id, userId);
  }

  @Delete('followers/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить подписчика' })
  async removeFollower(@CurrentUser() user: AuthUser, @Param('userId', ParseUUIDPipe) userId: string): Promise<void> {
    await this.follows.removeFollower(user.id, userId);
  }

  @Get('follow-requests')
  @ApiOperation({ summary: 'Входящие запросы на подписку' })
  requests(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto): Promise<Paginated<FollowRequestDto>> {
    return this.follows.incomingRequests(user.id, query);
  }

  @Post('follow-requests/:id/accept')
  @HttpCode(HttpStatus.NO_CONTENT)
  async accept(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.follows.accept(user.id, id);
  }

  @Post('follow-requests/:id/decline')
  @HttpCode(HttpStatus.NO_CONTENT)
  async decline(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.follows.decline(user.id, id);
  }

  @Get('profiles/:username/followers')
  followers(
    @CurrentUser() user: AuthUser,
    @Param('username') username: string,
    @Query() query: PaginationQueryDto,
  ): Promise<Paginated<FollowListItem>> {
    return this.follows.followers(user.id, username, query);
  }

  @Get('profiles/:username/following')
  following(
    @CurrentUser() user: AuthUser,
    @Param('username') username: string,
    @Query() query: PaginationQueryDto,
  ): Promise<Paginated<FollowListItem>> {
    return this.follows.following(user.id, username, query);
  }
}
