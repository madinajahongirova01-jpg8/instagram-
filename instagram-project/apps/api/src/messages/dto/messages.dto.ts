import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { MESSAGE_MAX } from '@insta/shared';
import { MessageType } from '../../generated/prisma/client';

export class CreateConversationDto {
  @ApiProperty({ type: [String], description: 'Собеседники (без себя). Один — личный чат, несколько — группа' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(31)
  @IsUUID('all', { each: true })
  participantIds: string[];

  @ApiPropertyOptional({ maxLength: 60, description: 'Название группы' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  title?: string;
}

export class SendMessageDto {
  @ApiPropertyOptional({ enum: MessageType, default: MessageType.TEXT })
  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  @ApiPropertyOptional({ maxLength: MESSAGE_MAX })
  @ValidateIf((o: SendMessageDto) => (o.type ?? 'TEXT') === 'TEXT' || o.content !== undefined)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(MESSAGE_MAX)
  content?: string;

  @ApiPropertyOptional({ description: 'Файл (POST /media, purpose=MESSAGE) для IMAGE/VIDEO/AUDIO' })
  @IsOptional()
  @IsUUID()
  mediaId?: string;

  @ApiPropertyOptional({ description: 'Пост для типа POST_SHARE' })
  @IsOptional()
  @IsUUID()
  sharedPostId?: string;
}

export class ReactionDto {
  @ApiProperty({ example: '❤️' })
  @IsString()
  @MaxLength(16)
  @Matches(/^\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}|\p{Emoji_Modifier})*$/u, {
    message: 'emoji must be a single emoji',
  })
  emoji: string;
}
