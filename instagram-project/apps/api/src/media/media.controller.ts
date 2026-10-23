import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { VIDEO_MAX_BYTES, type MediaDto } from '@insta/shared';
import { Public } from '../common/decorators/public.decorator';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { SignedFileQueryDto, UploadMediaDto, UploadMediaSwaggerDto } from './dto/media.dto';
import { MediaService, UploadedFileLike } from './media.service';

@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @ApiBearerAuth()
  @Post()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadMediaSwaggerDto })
  @ApiOperation({ summary: 'Загрузить файл. Затем id файла передаётся при создании поста, story, reel, сообщения или аватара' })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: VIDEO_MAX_BYTES, files: 1 } }))
  upload(
    @CurrentUser() user: AuthUser,
    @Body() dto: UploadMediaDto,
    @UploadedFile() file: UploadedFileLike | undefined,
  ): Promise<MediaDto> {
    return this.media.upload(user.id, dto.purpose, file);
  }

  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({ summary: 'Метаданные своего файла' })
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<MediaDto> {
    return this.media.getOwn(user.id, id);
  }

  @ApiBearerAuth()
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить свой файл, который ещё ни к чему не прикреплён' })
  async remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.media.deleteUnattached(user.id, id);
  }

  @Public()
  @Get(':id/file')
  @ApiOperation({ summary: 'Файл по подписанной ссылке (ссылки выдаёт API только тем, кому разрешён просмотр)' })
  async file(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: SignedFileQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.media.resolveSignedFile(id, query.exp, query.sig);
    res.sendFile(file.path, {
      dotfiles: 'allow',
      headers: {
        'Content-Type': file.mimeType,
        'Cache-Control': 'private, max-age=3600',
        'Content-Disposition': 'inline',
      },
    });
  }
}
