import type { UserSummary } from './types';

export const RealtimeEvents = {
  TypingStart: 'typing:start',
  TypingStop: 'typing:stop',
  Typing: 'typing',
  ConversationRead: 'conversation:read',
  MessageNew: 'message:new',
  MessageDeleted: 'message:deleted',
  MessageReaction: 'message:reaction',
  PresenceOnline: 'presence:online',
  PresenceOffline: 'presence:offline',
  NotificationNew: 'notification:new',
  CallOffer: 'call:offer',
  CallAnswer: 'call:answer',
  CallIceCandidate: 'call:ice-candidate',
  CallReject: 'call:reject',
  CallEnd: 'call:end',
  Error: 'error',
} as const;

export type RealtimeEvent = (typeof RealtimeEvents)[keyof typeof RealtimeEvents];

export type CallType = 'VOICE' | 'VIDEO';

export interface CallOfferPayload {
  toUserId: string;
  callType: CallType;
  sdp: string;
}

export interface CallAnswerPayload {
  toUserId: string;
  sdp: string;
}

export interface CallIcePayload {
  toUserId: string;
  candidate: string;
}

export interface CallTargetPayload {
  toUserId: string;
}

export const CALL_REJECT_REASONS = ['REJECTED', 'BUSY'] as const;

export type CallRejectReason = (typeof CALL_REJECT_REASONS)[number];

export interface CallRejectPayload extends CallTargetPayload {
  reason?: CallRejectReason;
}

export interface RealtimeAck {
  ok: boolean;
  error?: string;
}

export interface CallOfferEvent {
  fromUserId: string;
  from: UserSummary;
  callType: CallType;
  sdp: string;
}

export interface CallAnswerEvent {
  fromUserId: string;
  sdp: string;
}

export interface CallIceEvent {
  fromUserId: string;
  candidate: string;
}

export interface CallRejectEvent {
  fromUserId: string;
  reason: CallRejectReason;
}

export interface CallEndEvent {
  fromUserId: string;
}

export interface TypingPayload {
  conversationId: string;
}
