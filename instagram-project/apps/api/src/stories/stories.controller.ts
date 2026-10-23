import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Paginated } from '@insta/shared';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/pagination/pagination';
import { CreateStoryDto } from './dto/stories.dto';
import { StoriesService, StoryDto, StoryGroupDto, StoryViewerDto } from './stories.service';

@ApiTags('Stories')
@ApiBearerAuth()
@Controller()
export class StoriesController {
  constructor(private readonly stories: StoriesService) {}

  @Post('stories')
  @ApiOperation({ summary: 'Создать story. Через 24 часа она исчезает автоматически' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateStoryDto): Promise<StoryDto> {
    return this.stories.create(user.id, dto);
  }

  @Get('stories/feed')
  @ApiOperation({ summary: 'Активные stories подписок, сгруппированные по автору (непросмотренные первыми)' })
  feed(@CurrentUser() user: AuthUser): Promise<StoryGroupDto[]> {
    return this.stories.feed(user.id);
  }

  @Post('stories/:id/view')
  @HttpCode(HttpStatus.NO_CONTENT)
  async view(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.stories.view(user.id, id);
  }

  @Get('stories/:id/viewers')
  @ApiOperation({ summary: 'Кто посмотрел story (только автор)' })
  viewers(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PaginationQueryDto,
  ): Promise<Paginated<StoryViewerDto>> {
    return this.stories.viewers(user.id, id, query);
  }

  @Delete('stories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.stories.remove(user.id, id);
  }

  @Get('profiles/:username/stories')
  listByUser(@CurrentUser() user: AuthUser, @Param('username') username: string): Promise<StoryDto[]> {
    return this.stories.listByUser(user.id, username);
  }
}
