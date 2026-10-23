import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Paginated, PostDto } from '@insta/shared';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/pagination/pagination';
import { ExploreDto, FeedService } from './feed.service';

@ApiTags('Feed')
@ApiBearerAuth()
@Controller('feed')
export class FeedController {
  constructor(private readonly feed: FeedService) {}

  @Get()
  @ApiOperation({ summary: 'Лента: свои посты и посты подписок, новые сверху, курсорная пагинация' })
  list(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto): Promise<Paginated<PostDto>> {
    return this.feed.feed(user.id, query);
  }

  @Get('explore')
  @ApiOperation({ summary: 'Популярное за 30 дней у публичных аккаунтов, тренды хэштегов, рекомендации' })
  explore(@CurrentUser() user: AuthUser): Promise<ExploreDto> {
    return this.feed.explore(user.id);
  }
}
