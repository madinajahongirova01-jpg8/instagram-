import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ContactDto, CurrentUser as CurrentUserDto, UserSummary } from '@insta/shared';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { ChangeEmailDto, ChangeUsernameDto, CurrentPasswordDto } from './dto/users.dto';
import { PresenceDto, UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('suggested')
  @ApiOperation({ summary: 'Рекомендуемые пользователи (популярные, на которых вы ещё не подписаны)' })
  suggested(@CurrentUser() user: AuthUser): Promise<UserSummary[]> {
    return this.users.suggested(user.id);
  }

  @Get('me/contacts')
  @ApiOperation({ summary: 'Контакты: собеседники личных диалогов (новые сверху) с онлайн-статусом (учитывает showOnlineStatus)' })
  contacts(@CurrentUser() user: AuthUser): Promise<ContactDto[]> {
    return this.users.contacts(user.id);
  }

  @Patch('me/username')
  changeUsername(@CurrentUser() user: AuthUser, @Body() dto: ChangeUsernameDto): Promise<CurrentUserDto> {
    return this.users.changeUsername(user.id, dto);
  }

  @Patch('me/email')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Смена email (нужен пароль). Новый email нужно подтвердить' })
  changeEmail(@CurrentUser() user: AuthUser, @Body() dto: ChangeEmailDto): Promise<CurrentUserDto> {
    return this.users.changeEmail(user.id, dto);
  }

  @Delete('me')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить аккаунт навсегда (нужен пароль)' })
  async deleteAccount(@CurrentUser() user: AuthUser, @Body() dto: CurrentPasswordDto): Promise<void> {
    await this.users.deleteAccount(user.id, dto.password);
  }

  @Get(':id/presence')
  @ApiOperation({ summary: 'Онлайн-статус (учитывает настройку showOnlineStatus)' })
  presence(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<PresenceDto> {
    return this.users.presence(user.id, id);
  }
}
