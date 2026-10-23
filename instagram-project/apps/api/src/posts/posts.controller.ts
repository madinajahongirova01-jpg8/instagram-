import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Paginated, PostDto } from '@insta/shared';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/pagination/pagination';
import { CreatePostDto, UpdatePostDto } from './dto/posts.dto';
import { PostsService } from './posts.service';

@ApiTags('Posts')
@ApiBearerAuth()
@Controller()
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Post('posts')
  @ApiOperation({ summary: 'Создать пост из загруженных файлов. #хэштеги и @упоминания берутся из подписи' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePostDto): Promise<PostDto> {
    return this.posts.create(user.id, dto);
  }

  @Get('posts/:id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<PostDto> {
    return this.posts.get(user.id, id);
  }

  @Patch('posts/:id')
  @ApiOperation({ summary: 'Изменить свой пост' })
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePostDto): Promise<PostDto> {
    return this.posts.update(user.id, id, dto);
  }

  @Delete('posts/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.posts.remove(user.id, id);
  }

  @Post('posts/:id/save')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Сохранить пост в «Сохранённое» (видно только вам)' })
  save(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<{ saved: boolean }> {
    return this.posts.save(user.id, id);
  }

  @Delete('posts/:id/save')
  @ApiOperation({ summary: 'Убрать пост из «Сохранённого»' })
  unsave(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<{ saved: boolean }> {
    return this.posts.unsave(user.id, id);
  }

  @Get('users/me/saved')
  @ApiOperation({ summary: 'Мои сохранённые посты (новые сверху). Скрытые для меня посты не возвращаются' })
  saved(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto): Promise<Paginated<PostDto>> {
    return this.posts.saved(user.id, query);
  }

  @Get('profiles/:username/posts')
  @ApiOperation({ summary: 'Посты пользователя (403 для приватного аккаунта без подписки)' })
  listByUser(
    @CurrentUser() user: AuthUser,
    @Param('username') username: string,
    @Query() query: PaginationQueryDto,
  ): Promise<Paginated<PostDto>> {
    return this.posts.listByUser(user.id, username, query);
  }
}
