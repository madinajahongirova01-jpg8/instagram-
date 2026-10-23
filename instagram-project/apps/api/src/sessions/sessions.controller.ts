import { Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { SessionDto } from '@insta/shared';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { SessionsService } from './sessions.service';

@ApiTags('Sessions')
@ApiBearerAuth()
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Get()
  @ApiOperation({ summary: 'Активные сессии (устройства) текущего пользователя' })
  list(@CurrentUser() user: AuthUser): Promise<SessionDto[]> {
    return this.sessions.list(user.id, user.sessionId);
  }

  @Delete('others')
  @ApiOperation({ summary: 'Завершить все сессии, кроме текущей' })
  async revokeOthers(@CurrentUser() user: AuthUser): Promise<{ revoked: number }> {
    return { revoked: await this.sessions.revokeAllExcept(user.id, user.sessionId) };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Завершить одну сессию' })
  async revoke(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.sessions.revokeOwnSession(user.id, id);
  }
}
