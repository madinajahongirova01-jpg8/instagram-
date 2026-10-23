import { ApiProperty, ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { CAPTION_MAX, POST_MEDIA_MAX } from '@insta/shared';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreatePostDto {
  @ApiProperty({ type: [String], description: 'id файлов (POST /media, purpose=POST) в нужном порядке' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(POST_MEDIA_MAX)
  @IsUUID('all', { each: true })
  mediaIds: string[];

  @ApiPropertyOptional({ maxLength: CAPTION_MAX, example: 'Первый пост! #softclub @madina.dev' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(CAPTION_MAX)
  caption?: string;

  @ApiPropertyOptional({ nullable: true, example: 'Dushanbe' })
  @IsOptional()
  @Transform(trim)
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @MaxLength(100)
  location?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  commentsDisabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hideLikeCount?: boolean;
}

export class UpdatePostDto extends PartialType(OmitType(CreatePostDto, ['mediaIds'] as const)) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}
