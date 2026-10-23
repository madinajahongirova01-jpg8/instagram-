import { Module } from '@nestjs/common';
import { SessionsModule } from '../sessions/sessions.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { VerificationService } from './verification.service';

@Module({
  imports: [SessionsModule],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, VerificationService],
  exports: [AuthService, PasswordService, VerificationService],
})
export class AuthModule {}
