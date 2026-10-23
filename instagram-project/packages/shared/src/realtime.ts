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

export interface TypingPayload {
  conversationId: string;
}
