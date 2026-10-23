import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Paginated } from '@insta/shared';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/pagination/pagination';
import { CommentDto, CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/comments.dto';

const COMMENT_LIMIT = { default: { limit: 30, ttl: 60_000 } };

@ApiTags('Comments')
@ApiBearerAuth()
@Controller()
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get('posts/:postId/comments')
  @ApiOperation({ summary: 'Комментарии первого уровня к посту' })
  listForPost(
    @CurrentUser() user: AuthUser,
    @Param('postId', ParseUUIDPipe) postId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<Paginated<CommentDto>> {
    return this.comments.list(user.id, { postId }, query);
  }

  @Post('posts/:postId/comments')
  @Throttle(COMMENT_LIMIT)
  @ApiOperation({ summary: 'Комментарий или ответ (parentId) к посту' })
  createForPost(
    @CurrentUser() user: AuthUser,
    @Param('postId', ParseUUIDPipe) postId: string,
    @Body() dto: CreateCommentDto,
  ): Promise<CommentDto> {
    return this.comments.create(user.id, { postId }, dto);
  }

  @Get('reels/:reelId/comments')
  listForReel(
    @CurrentUser() user: AuthUser,
    @Param('reelId', ParseUUIDPipe) reelId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<Paginated<CommentDto>> {
    return this.comments.list(user.id, { reelId }, query);
  }

  @Post('reels/:reelId/comments')
  @Throttle(COMMENT_LIMIT)
  createForReel(
    @CurrentUser() user: AuthUser,
    @Param('reelId', ParseUUIDPipe) reelId: string,
    @Body() dto: CreateCommentDto,
  ): Promise<CommentDto> {
    return this.comments.create(user.id, { reelId }, dto);
  }

  @Get('comments/:id/replies')
  replies(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PaginationQueryDto,
  ): Promise<Paginated<CommentDto>> {
    return this.comments.replies(user.id, id, query);
  }

  @Delete('comments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить комментарий (автор комментария или владелец поста/reel)' })
  async remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.comments.remove(user.id, id);
  }
}
