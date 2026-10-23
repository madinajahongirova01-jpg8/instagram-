import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { PAGE_LIMIT_DEFAULT, PAGE_LIMIT_MAX, Paginated } from '@insta/shared';

export class PaginationQueryDto {
  @ApiPropertyOptional({ description: 'id последнего элемента предыдущей страницы' })
  @IsOptional()
  @IsUUID()
  cursor?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: PAGE_LIMIT_MAX, default: PAGE_LIMIT_DEFAULT })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PAGE_LIMIT_MAX)
  limit?: number;
}

export interface PageArgs {
  take: number;
  skip?: number;
  cursor?: { id: string };
}

export function pageArgs(query: PaginationQueryDto): PageArgs {
  const limit = query.limit ?? PAGE_LIMIT_DEFAULT;
  return query.cursor
    ? { take: limit + 1, skip: 1, cursor: { id: query.cursor } }
    : { take: limit + 1 };
}

export function toPage<T extends { id: string }, R>(
  rows: T[],
  query: PaginationQueryDto,
  map: (row: T) => R,
): Paginated<R> {
  const limit = query.limit ?? PAGE_LIMIT_DEFAULT;
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return {
    items: page.map(map),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
}
