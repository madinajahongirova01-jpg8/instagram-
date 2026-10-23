import { Body, Controller, Delete, Get, Param, Patch, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { CurrentUser as CurrentUserDto, ProfileDto } from '@insta/shared';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { SetAvatarDto, UpdateProfileDto } from './dto/profiles.dto';
import { ProfilesService } from './profiles.service';

@ApiTags('Profiles')
@ApiBearerAuth()
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Patch('me')
  @ApiOperation({ summary: 'Изменить имя, био, сайт' })
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto): Promise<CurrentUserDto> {
    return this.profiles.update(user.id, dto);
  }

  @Put('me/avatar')
  @ApiOperation({ summary: 'Установить аватар (файл с purpose=AVATAR)' })
  setAvatar(@CurrentUser() user: AuthUser, @Body() dto: SetAvatarDto): Promise<CurrentUserDto> {
    return this.profiles.setAvatar(user.id, dto);
  }

  @Delete('me/avatar')
  removeAvatar(@CurrentUser() user: AuthUser): Promise<CurrentUserDto> {
    return this.profiles.removeAvatar(user.id);
  }

  @Get(':username')
  @ApiOperation({ summary: 'Профиль пользователя. Для приватного аккаунта canViewContent=false' })
  get(@CurrentUser() user: AuthUser, @Param('username') username: string): Promise<ProfileDto> {
    return this.profiles.getByUsername(user.id, username);
  }
}
