import { Controller, Get, Param, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Paginated, PostDto } from '@insta/shared';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/pagination/pagination';
import { SearchQueryDto } from './dto/search.dto';
import { SearchResultDto, SearchService } from './search.service';

@ApiTags('Search')
@ApiBearerAuth()
@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Поиск пользователей (username/имя), хэштегов и постов. Префиксы @ и # убираются' })
  find(@CurrentUser() user: AuthUser, @Query() query: SearchQueryDto): Promise<SearchResultDto> {
    return this.search.search(user.id, query);
  }

  @Get('hashtags/:name/posts')
  @ApiOperation({ summary: 'Посты с хэштегом' })
  byHashtag(
    @CurrentUser() user: AuthUser,
    @Param('name') name: string,
    @Query() query: PaginationQueryDto,
  ): Promise<Paginated<PostDto>> {
    return this.search.postsByHashtag(user.id, name, query);
  }
}
