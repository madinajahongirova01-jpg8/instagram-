import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { StoryAudience } from '../../generated/prisma/client';

export class CreateStoryDto {
  @ApiProperty({ description: 'Файл (POST /media, purpose=STORY)' })
  @IsUUID()
  mediaId: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(200)
  caption?: string;

  @ApiPropertyOptional({ enum: StoryAudience, default: 'EVERYONE', description: 'Кто видит: все / только подписчики / близкие друзья' })
  @IsOptional()
  @IsEnum(StoryAudience)
  audience?: StoryAudience;
}
