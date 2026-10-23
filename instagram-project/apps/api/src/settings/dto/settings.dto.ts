import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  likes?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  comments?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  follows?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  followRequests?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  mentions?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  messages?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;
}
