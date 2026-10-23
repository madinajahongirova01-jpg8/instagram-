import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { Audience, ReportReason, ReportTarget } from '../../generated/prisma/client';

export class UpdatePrivacySettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @ApiPropertyOptional({ enum: Audience })
  @IsOptional()
  @IsEnum(Audience)
  allowTagging?: Audience;

  @ApiPropertyOptional({ enum: Audience })
  @IsOptional()
  @IsEnum(Audience)
  allowMentions?: Audience;

  @ApiPropertyOptional({ enum: Audience })
  @IsOptional()
  @IsEnum(Audience)
  allowComments?: Audience;

  @ApiPropertyOptional({ enum: Audience })
  @IsOptional()
  @IsEnum(Audience)
  allowDirectMessages?: Audience;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showOnlineStatus?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showReadReceipts?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowStoryReplies?: boolean;
}

export class CreateReportDto {
  @ApiProperty({ enum: ReportTarget })
  @IsEnum(ReportTarget)
  targetType: ReportTarget;

  @ApiProperty()
  @IsUUID()
  targetId: string;

  @ApiProperty({ enum: ReportReason })
  @IsEnum(ReportReason)
  reason: ReportReason;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
