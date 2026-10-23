import { Global, Module } from '@nestjs/common';
import { PrivacyController } from './privacy.controller';
import { PrivacyService } from './privacy.service';
import { VisibilityService } from './visibility.service';

@Global()
@Module({
  controllers: [PrivacyController],
  providers: [PrivacyService, VisibilityService],
  exports: [VisibilityService],
})
export class PrivacyModule {}
