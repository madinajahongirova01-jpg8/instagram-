import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsString, Matches } from 'class-validator';
import { MediaPurpose } from '../../generated/prisma/client';

export class UploadMediaDto {
  @ApiProperty({ enum: MediaPurpose, description: 'Для чего загружается файл' })
  @IsEnum(MediaPurpose)
  purpose: MediaPurpose;
}

export class UploadMediaSwaggerDto extends UploadMediaDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: unknown;
}

export class SignedFileQueryDto {
  @Type(() => Number)
  @IsInt()
  exp: number;

  @IsString()
  @Matches(/^[A-Za-z0-9_-]{43}$/)
  sig: string;
}
