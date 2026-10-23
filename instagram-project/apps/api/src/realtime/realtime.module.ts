import { Module } from '@nestjs/common';
import { MessagesModule } from '../messages/messages.module';
import { SessionsModule } from '../sessions/sessions.module';
import { RealtimeGateway } from './realtime.gateway';

@Module({
  imports: [MessagesModule, SessionsModule],
  providers: [RealtimeGateway],
})
export class RealtimeModule {}
