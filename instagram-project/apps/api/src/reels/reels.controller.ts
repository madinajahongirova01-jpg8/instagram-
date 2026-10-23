import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Paginated } from '@insta/shared';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/pagination/pagination';
import { CreateReelDto } from './dto/reels.dto';
import { ReelDto, ReelsService } from './reels.service';

@ApiTags('Reels')
@ApiBearerAuth()
@Controller()
export class ReelsController {
  constructor(private readonly reels: ReelsService) {}

  @Post('reels')
  @ApiOperation({ summary: 'Создать reel из загруженного видео' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateReelDto): Promise<ReelDto> {
    return this.reels.create(user.id, dto);
  }

  @Get('reels')
  @ApiOperation({ summary: 'Reels подписок и свои (новые сверху)' })
  feed(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto): Promise<Paginated<ReelDto>> {
    return this.reels.feed(user.id, query);
  }

  @Get('reels/:id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<ReelDto> {
    return this.reels.get(user.id, id);
  }

  @Post('reels/:id/view')
  @HttpCode(HttpStatus.NO_CONTENT)
  async view(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.reels.view(user.id, id);
  }

  @Delete('reels/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.reels.remove(user.id, id);
  }

  @Get('profiles/:username/reels')
  listByUser(
    @CurrentUser() user: AuthUser,
    @Param('username') username: string,
    @Query() query: PaginationQueryDto,
  ): Promise<Paginated<ReelDto>> {
    return this.reels.listByUser(user.id, username, query);
  }
}
