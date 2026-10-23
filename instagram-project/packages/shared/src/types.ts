export type Audience = 'EVERYONE' | 'FOLLOWERS' | 'FOLLOWING' | 'NO_ONE';

export type StoryAudience = 'EVERYONE' | 'FOLLOWERS' | 'CLOSE_FRIENDS';

export type MediaKind = 'IMAGE' | 'VIDEO' | 'AUDIO';

export type MediaPurpose = 'AVATAR' | 'POST' | 'STORY' | 'REEL' | 'MESSAGE';

export type MessageType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'POST_SHARE';

export type NotificationType =
  | 'LIKE'
  | 'COMMENT'
  | 'FOLLOW'
  | 'FOLLOW_REQUEST'
  | 'FOLLOW_ACCEPTED'
  | 'MENTION'
  | 'MESSAGE';

export type FollowStatus = 'NONE' | 'FOLLOWING' | 'REQUESTED';

export type ReportReason =
  | 'SPAM'
  | 'HARASSMENT'
  | 'HATE_SPEECH'
  | 'VIOLENCE'
  | 'NUDITY'
  | 'FALSE_INFORMATION'
  | 'COPYRIGHT'
  | 'OTHER';

export type ReportTarget = 'USER' | 'POST' | 'COMMENT' | 'STORY' | 'REEL' | 'MESSAGE';

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}

export interface MediaDto {
  id: string;
  kind: MediaKind;
  mimeType: string;
  width: number | null;
  height: number | null;
  url: string;
}

export interface UserSummary {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  isVerified: boolean;
}

export interface CurrentUser extends UserSummary {
  email: string;
  emailVerified: boolean;
  bio: string;
  website: string | null;
  isPrivate: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
}

export interface ProfileDto extends UserSummary {
  bio: string;
  website: string | null;
  isPrivate: boolean;
  isMe: boolean;
  canViewContent: boolean;
  followStatus: FollowStatus;
  followsYou: boolean;
  blockedByMe: boolean;
  counts: {
    posts: number;
    followers: number;
    following: number;
  };
}

export interface PostDto {
  id: string;
  author: UserSummary;
  caption: string;
  location: string | null;
  media: MediaDto[];
  hashtags: string[];
  likesCount: number | null;
  commentsCount: number;
  likedByMe: boolean;
  savedByMe: boolean;
  commentsDisabled: boolean;
  hideLikeCount: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  user: CurrentUser;
}

export interface SessionDto {
  id: string;
  userAgent: string | null;
  ip: string | null;
  createdAt: string;
  lastUsedAt: string;
  current: boolean;
}

export interface MessageResponse {
  message: string;
}

export interface ContactDto extends UserSummary {
  online: boolean;
  lastSeenAt: string | null;
}

export interface CountResponse {
  count: number;
}

export interface NotificationDto {
  id: string;
  type: NotificationType;
  actor: UserSummary;
  entityId: string | null;
  preview: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface PresencePayload {
  userId: string;
  at: string;
}

export interface ReelDto {
  id: string;
  author: UserSummary;
  caption: string;
  video: MediaDto;
  thumbnail: MediaDto | null;
  durationSec: number | null;
  hashtags: string[];
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  likedByMe: boolean;
  allowComments: boolean;
  createdAt: string;
}

export interface StoryDto {
  id: string;
  authorId: string;
  media: MediaDto;
  caption: string;
  audience: StoryAudience;
  seen: boolean;
  viewsCount: number | null;
  createdAt: string;
  expiresAt: string;
}

export interface StoryGroupDto {
  author: UserSummary;
  hasUnseen: boolean;
  latestAt: string;
  stories: StoryDto[];
}

export interface StoryViewerDto {
  user: UserSummary;
  viewedAt: string;
}

export interface CommentDto {
  id: string;
  author: UserSummary;
  content: string;
  parentId: string | null;
  likesCount: number;
  repliesCount: number;
  likedByMe: boolean;
  createdAt: string;
}

export interface MessageDto {
  id: string;
  conversationId: string;
  sender: UserSummary;
  type: MessageType;
  content: string | null;
  media: MediaDto | null;
  sharedPost: { id: string; author: UserSummary; cover: MediaDto | null } | null;
  reactions: { userId: string; emoji: string }[];
  deleted: boolean;
  createdAt: string;
}

export interface ConversationParticipantDto extends UserSummary {
  lastReadAt: string | null;
}

export interface ConversationDto {
  id: string;
  isGroup: boolean;
  title: string | null;
  participants: ConversationParticipantDto[];
  lastMessage: MessageDto | null;
  lastMessageAt: string;
  unreadCount: number;
}

export interface FollowRequestDto {
  id: string;
  requester: UserSummary;
  createdAt: string;
}

export interface FollowListItem extends UserSummary {
  followedByMe: boolean;
}

export interface LikeState {
  liked: boolean;
  likesCount: number;
}

export interface SearchResultDto {
  users: UserSummary[];
  hashtags: { name: string; postsCount: number }[];
  posts: PostDto[];
}

export interface ExploreDto {
  posts: PostDto[];
  reels: ReelDto[];
  trendingHashtags: { name: string; postsCount: number }[];
  suggestedUsers: UserSummary[];
}

export interface PresenceDto {
  online: boolean;
  lastSeenAt: string | null;
}

export interface PrivacySettingsDto {
  isPrivate: boolean;
  allowTagging: Audience;
  allowMentions: Audience;
  allowComments: Audience;
  allowDirectMessages: Audience;
  showOnlineStatus: boolean;
  showReadReceipts: boolean;
  allowStoryReplies: boolean;
}

export interface NotificationSettingsDto {
  likes: boolean;
  comments: boolean;
  follows: boolean;
  followRequests: boolean;
  mentions: boolean;
  messages: boolean;
  emailNotifications: boolean;
}

export interface TypingPayloadDto {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

export interface MessageReactionPayload {
  conversationId: string;
  messageId: string;
  userId: string;
  emoji: string | null;
}

export interface MessageDeletedPayload {
  conversationId: string;
  messageId: string;
}

export interface ConversationReadPayload {
  conversationId: string;
  userId: string;
  readAt: string;
}
