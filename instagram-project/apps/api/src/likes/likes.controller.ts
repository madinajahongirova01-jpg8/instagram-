import { Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Paginated, UserSummary } from '@insta/shared';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/pagination/pagination';
import { LikeState, LikesService } from './likes.service';

@ApiTags('Likes')
@ApiBearerAuth()
@Controller()
export class LikesController {
  constructor(private readonly likes: LikesService) {}

  @Post('posts/:id/like')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Поставить лайк (повторный вызов ничего не ломает)' })
  likePost(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<LikeState> {
    return this.likes.like(user.id, { postId: id });
  }

  @Delete('posts/:id/like')
  unlikePost(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<LikeState> {
    return this.likes.unlike(user.id, { postId: id });
  }

  @Get('posts/:id/likes')
  @ApiOperation({ summary: 'Кто лайкнул пост' })
  likers(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PaginationQueryDto,
  ): Promise<Paginated<UserSummary>> {
    return this.likes.listPostLikers(user.id, id, query);
  }

  @Post('reels/:id/like')
  @HttpCode(HttpStatus.OK)
  likeReel(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<LikeState> {
    return this.likes.like(user.id, { reelId: id });
  }

  @Delete('reels/:id/like')
  unlikeReel(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<LikeState> {
    return this.likes.unlike(user.id, { reelId: id });
  }

  @Post('comments/:id/like')
  @HttpCode(HttpStatus.OK)
  likeComment(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<LikeState> {
    return this.likes.like(user.id, { commentId: id });
  }

  @Delete('comments/:id/like')
  unlikeComment(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<LikeState> {
    return this.likes.unlike(user.id, { commentId: id });
  }
}
