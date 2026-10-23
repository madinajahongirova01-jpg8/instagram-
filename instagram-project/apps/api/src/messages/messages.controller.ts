import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { CountResponse, Paginated } from '@insta/shared';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/pagination/pagination';
import { CreateConversationDto, ReactionDto, SendMessageDto } from './dto/messages.dto';
import { ConversationDto, MessageDto, MessagesService } from './messages.service';

@ApiTags('Messages')
@ApiBearerAuth()
@Controller()
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Диалоги: участники, последнее сообщение, число непрочитанных' })
  list(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto): Promise<Paginated<ConversationDto>> {
    return this.messages.listConversations(user.id, query);
  }

  @Get('conversations/unread-count')
  @ApiOperation({ summary: 'Сколько диалогов содержат непрочитанные сообщения (для бейджа)' })
  async unreadCount(@CurrentUser() user: AuthUser): Promise<CountResponse> {
    return { count: await this.messages.unreadConversationsCount(user.id) };
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Создать диалог. Личный диалог с тем же человеком не дублируется' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateConversationDto): Promise<ConversationDto> {
    return this.messages.createConversation(user.id, dto);
  }

  @Get('conversations/:id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<ConversationDto> {
    return this.messages.getConversation(user.id, id);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Сообщения (новые сверху). Первая страница отмечает диалог прочитанным' })
  messagesList(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PaginationQueryDto,
  ): Promise<Paginated<MessageDto>> {
    return this.messages.listMessages(user.id, id, query);
  }

  @Post('conversations/:id/messages')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Отправить сообщение: TEXT, IMAGE, VIDEO, AUDIO (голосовое) или POST_SHARE' })
  send(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SendMessageDto): Promise<MessageDto> {
    return this.messages.send(user.id, id, dto);
  }

  @Post('conversations/:id/read')
  @HttpCode(HttpStatus.OK)
  read(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<{ readAt: string }> {
    return this.messages.markRead(user.id, id);
  }

  @Delete('messages/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить своё сообщение у всех' })
  async remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.messages.deleteMessage(user.id, id);
  }

  @Put('messages/:id/reaction')
  @HttpCode(HttpStatus.NO_CONTENT)
  async react(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ReactionDto): Promise<void> {
    await this.messages.react(user.id, id, dto.emoji);
  }

  @Delete('messages/:id/reaction')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unreact(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.messages.react(user.id, id, null);
  }
}
