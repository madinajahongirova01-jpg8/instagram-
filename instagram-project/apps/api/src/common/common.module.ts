import { Global, Module } from '@nestjs/common';
import { DtoMapper } from './mappers/dto-mapper.service';
import { MediaUrlService } from './mappers/media-url.service';

@Global()
@Module({
  providers: [MediaUrlService, DtoMapper],
  exports: [MediaUrlService, DtoMapper],
})
export class CommonModule {}
