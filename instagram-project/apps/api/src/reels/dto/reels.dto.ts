import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { CAPTION_MAX } from '@insta/shared';

export class CreateReelDto {
  @ApiProperty({ description: 'Видео (POST /media, purpose=REEL)' })
  @IsUUID()
  videoMediaId: string;

  @ApiPropertyOptional({ description: 'Обложка-картинка (POST /media, purpose=REEL)' })
  @IsOptional()
  @IsUUID()
  thumbnailMediaId?: string;

  @ApiPropertyOptional({ maxLength: CAPTION_MAX })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(CAPTION_MAX)
  caption?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 180 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(180)
  durationSec?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  allowComments?: boolean;
}
