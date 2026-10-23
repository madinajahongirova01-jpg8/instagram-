import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { COMMENT_MAX } from '@insta/shared';

export class CreateCommentDto {
  @ApiProperty({ maxLength: COMMENT_MAX, example: 'Классно! @madina.dev' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(COMMENT_MAX)
  content: string;

  @ApiPropertyOptional({ description: 'id комментария, на который отвечаем' })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
