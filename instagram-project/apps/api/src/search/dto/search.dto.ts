import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { SEARCH_QUERY_MAX } from '@insta/shared';

export const SEARCH_TYPES = ['all', 'users', 'hashtags', 'posts'] as const;
export type SearchType = (typeof SEARCH_TYPES)[number];

export class SearchQueryDto {
  @ApiProperty({ minLength: 1, maxLength: SEARCH_QUERY_MAX, example: 'madina' })
  @IsString()
  @MinLength(1)
  @MaxLength(SEARCH_QUERY_MAX)
  q: string;

  @ApiPropertyOptional({ enum: SEARCH_TYPES, default: 'all' })
  @IsOptional()
  @IsIn(SEARCH_TYPES)
  type?: SearchType;
}
