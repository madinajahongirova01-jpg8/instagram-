import { createApi } from '@reduxjs/toolkit/query/react';
import type {
  AuthResponse,
  ContactDto,
  CountResponse,
  CurrentUser,
  FollowStatus,
  MediaDto,
  MediaPurpose,
  MessageResponse,
  ProfileDto,
  UserSummary,
} from '@insta/shared';
import { axiosBaseQuery } from './base-query';
import { signedOut, tokenReceived } from './auth-slice';

export interface LoginRequest {
  login: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  username: string;
  password: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface UpdateProfileRequest {
  fullName?: string;
  bio?: string;
  website?: string | null;
}

export interface UploadMediaRequest {
  file: File;
  purpose: MediaPurpose;
}

export interface FollowRequest {
  userId: string;
  username: string;
  follow: boolean;
}

export interface FollowResult {
  status: FollowStatus;
}

function followDelta(from: FollowStatus, to: FollowStatus): number {
  return (to === 'FOLLOWING' ? 1 : 0) - (from === 'FOLLOWING' ? 1 : 0);
}

export const api = createApi({
  reducerPath: 'api',
  baseQuery: axiosBaseQuery,
  tagTypes: [
    'Me',
    'Profile',
    'ProfilePosts',
    'ProfileReels',
    'Saved',
    'Suggested',
    'Contacts',
    'Notifications',
    'NotificationsCount',
    'NotificationSettings',
    'MessagesCount',
    'Post',
    'Feed',
    'Comments',
    'Stories',
    'Reels',
    'Explore',
    'FollowRequests',
    'Privacy',
    'Blocks',
    'CloseFriends',
    'StoryHidden',
    'Conversations',
    'Messages',
  ],
  endpoints: (build) => ({
    me: build.query<CurrentUser, void>({
      query: () => ({ url: '/auth/me' }),
      providesTags: ['Me'],
    }),
    login: build.mutation<AuthResponse, LoginRequest>({
      query: (data) => ({ url: '/auth/login', method: 'POST', data }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(tokenReceived(data.accessToken));
        dispatch(api.util.upsertQueryData('me', undefined, data.user));
      },
    }),
    register: build.mutation<AuthResponse, RegisterRequest>({
      query: (data) => ({ url: '/auth/register', method: 'POST', data }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(tokenReceived(data.accessToken));
        dispatch(api.util.upsertQueryData('me', undefined, data.user));
      },
    }),
    logout: build.mutation<void, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } finally {
          dispatch(signedOut());
          dispatch(api.util.resetApiState());
        }
      },
    }),
    verifyEmail: build.mutation<MessageResponse, string>({
      query: (token) => ({ url: '/auth/verify-email', method: 'POST', data: { token } }),
      invalidatesTags: ['Me'],
    }),
    resendVerification: build.mutation<MessageResponse, void>({
      query: () => ({ url: '/auth/resend-verification', method: 'POST' }),
    }),
    forgotPassword: build.mutation<MessageResponse, string>({
      query: (email) => ({ url: '/auth/forgot-password', method: 'POST', data: { email } }),
    }),
    resetPassword: build.mutation<MessageResponse, ResetPasswordRequest>({
      query: (data) => ({ url: '/auth/reset-password', method: 'POST', data }),
    }),
    changePassword: build.mutation<MessageResponse & { revokedSessions: number }, ChangePasswordRequest>({
      query: (data) => ({ url: '/auth/change-password', method: 'POST', data }),
    }),
    profile: build.query<ProfileDto, string>({
      query: (username) => ({ url: `/profiles/${encodeURIComponent(username)}` }),
      providesTags: (_result, _error, username) => [{ type: 'Profile', id: username }],
    }),
    updateProfile: build.mutation<CurrentUser, UpdateProfileRequest>({
      query: (data) => ({ url: '/profiles/me', method: 'PATCH', data }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(api.util.upsertQueryData('me', undefined, data));
      },
      invalidatesTags: (result) => (result ? [{ type: 'Profile', id: result.username }] : []),
    }),
    uploadMedia: build.mutation<MediaDto, UploadMediaRequest>({
      query: ({ file, purpose }) => {
        const form = new FormData();
        form.append('purpose', purpose);
        form.append('file', file);
        return { url: '/media', method: 'POST', data: form };
      },
    }),
    setAvatar: build.mutation<CurrentUser, string>({
      query: (mediaId) => ({ url: '/profiles/me/avatar', method: 'PUT', data: { mediaId } }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(api.util.upsertQueryData('me', undefined, data));
      },
      invalidatesTags: (result) => (result ? [{ type: 'Profile', id: result.username }] : []),
    }),
    removeAvatar: build.mutation<CurrentUser, void>({
      query: () => ({ url: '/profiles/me/avatar', method: 'DELETE' }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(api.util.upsertQueryData('me', undefined, data));
      },
      invalidatesTags: (result) => (result ? [{ type: 'Profile', id: result.username }] : []),
    }),
    suggestedUsers: build.query<UserSummary[], void>({
      query: () => ({ url: '/users/suggested' }),
      providesTags: ['Suggested'],
    }),
    contacts: build.query<ContactDto[], void>({
      query: () => ({ url: '/users/me/contacts' }),
      providesTags: ['Contacts'],
    }),
    notificationsUnreadCount: build.query<CountResponse, void>({
      query: () => ({ url: '/notifications/unread-count' }),
      providesTags: ['NotificationsCount'],
    }),
    messagesUnreadCount: build.query<CountResponse, void>({
      query: () => ({ url: '/conversations/unread-count' }),
      providesTags: ['MessagesCount'],
    }),
    markAllNotificationsRead: build.mutation<{ updated: number }, void>({
      query: () => ({ url: '/notifications/read-all', method: 'POST' }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          api.util.updateQueryData('notificationsUnreadCount', undefined, (draft) => {
            draft.count = 0;
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: ['NotificationsCount', 'Notifications'],
    }),
    setFollow: build.mutation<FollowResult, FollowRequest>({
      query: ({ userId, follow }) => ({ url: `/follows/${userId}`, method: follow ? 'POST' : 'DELETE' }),
      async onQueryStarted({ username, follow }, { dispatch, getState, queryFulfilled }) {
        const myUsername = api.endpoints.me.select()(getState()).data?.username;
        let delta = follow ? 1 : -1;
        const target = dispatch(
          api.util.updateQueryData('profile', username, (draft) => {
            const next: FollowStatus = follow ? (draft.isPrivate ? 'REQUESTED' : 'FOLLOWING') : 'NONE';
            delta = followDelta(draft.followStatus, next);
            draft.followStatus = next;
            draft.counts.followers += delta;
          }),
        );
        const mine = myUsername
          ? dispatch(
              api.util.updateQueryData('profile', myUsername, (draft) => {
                draft.counts.following += delta;
              }),
            )
          : null;
        try {
          await queryFulfilled;
          if (myUsername) {
            dispatch(api.util.invalidateTags([{ type: 'Profile', id: myUsername }]));
          }
        } catch {
          target.undo();
          mine?.undo();
        }
      },
      invalidatesTags: (_result, _error, { username }) => [{ type: 'Profile', id: username }, 'Feed', 'Stories', 'Reels'],
    }),
  }),
});

export const {
  useMeQuery,
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useVerifyEmailMutation,
  useResendVerificationMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useChangePasswordMutation,
  useProfileQuery,
  useUpdateProfileMutation,
  useUploadMediaMutation,
  useSetAvatarMutation,
  useRemoveAvatarMutation,
  useSuggestedUsersQuery,
  useContactsQuery,
  useNotificationsUnreadCountQuery,
  useMessagesUnreadCountQuery,
  useMarkAllNotificationsReadMutation,
  useSetFollowMutation,
} = api;
