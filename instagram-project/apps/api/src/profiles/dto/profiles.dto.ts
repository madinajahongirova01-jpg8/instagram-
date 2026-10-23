import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsUrl, IsUUID, MaxLength, ValidateIf } from 'class-validator';
import { BIO_MAX, FULL_NAME_MAX } from '@insta/shared';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class UpdateProfileDto {
  @ApiPropertyOptional({ maxLength: FULL_NAME_MAX })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(FULL_NAME_MAX)
  fullName?: string;

  @ApiPropertyOptional({ maxLength: BIO_MAX })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(BIO_MAX)
  bio?: string;

  @ApiPropertyOptional({ nullable: true, example: 'https://example.com' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' && value.trim() === '' ? null : value))
  @ValidateIf((_o, value) => value !== null)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(200)
  website?: string | null;
}

export class SetAvatarDto {
  @ApiProperty({ description: 'id файла, загруженного через POST /media с purpose=AVATAR' })
  @IsUUID()
  mediaId: string;
}
