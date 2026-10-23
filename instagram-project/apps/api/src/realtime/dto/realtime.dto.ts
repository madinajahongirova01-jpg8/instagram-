import { IsIn, IsString, IsUUID, MaxLength } from 'class-validator';
import type { CallType } from '@insta/shared';

export class ConversationEventDto {
  @IsUUID()
  conversationId: string;
}

export class CallTargetDto {
  @IsUUID()
  toUserId: string;
}

export class CallOfferDto extends CallTargetDto {
  @IsIn(['VOICE', 'VIDEO'])
  callType: CallType;

  @IsString()
  @MaxLength(20_000)
  sdp: string;
}

export class CallAnswerDto extends CallTargetDto {
  @IsString()
  @MaxLength(20_000)
  sdp: string;
}

export class CallIceDto extends CallTargetDto {
  @IsString()
  @MaxLength(2_000)
  candidate: string;
}
