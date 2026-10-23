import type {
  NotificationDto,
  NotificationSettingsDto,
  Paginated,
  PrivacySettingsDto,
  ReportReason,
  ReportTarget,
  UserSummary,
} from '@insta/shared';
import { api } from './api';

type Cursor = string | null;

export type PeopleList = 'close-friends' | 'story-hidden';

export interface ReportRequest {
  targetType: ReportTarget;
  targetId: string;
  reason: ReportReason;
}

export const settingsApi = api.injectEndpoints({
  endpoints: (build) => ({
    notificationsPage: build.infiniteQuery<Paginated<NotificationDto>, void, Cursor>({
      infiniteQueryOptions: {
        initialPageParam: null,
        getNextPageParam: (last) => last.nextCursor,
      },
      query: ({ pageParam }) => ({ url: '/notifications', params: pageParam ? { cursor: pageParam } : undefined }),
      providesTags: ['Notifications'],
    }),
    markNotificationRead: build.mutation<void, string>({
      query: (id) => ({ url: `/notifications/${id}/read`, method: 'PATCH' }),
      invalidatesTags: ['NotificationsCount', 'Notifications'],
    }),
    notificationSettings: build.query<NotificationSettingsDto, void>({
      query: () => ({ url: '/settings/notifications' }),
      providesTags: ['NotificationSettings'],
    }),
    updateNotificationSettings: build.mutation<NotificationSettingsDto, Partial<NotificationSettingsDto>>({
      query: (data) => ({ url: '/settings/notifications', method: 'PATCH', data }),
      async onQueryStarted(data, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          settingsApi.util.updateQueryData('notificationSettings', undefined, (draft) => {
            Object.assign(draft, data);
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),
    privacySettings: build.query<PrivacySettingsDto, void>({
      query: () => ({ url: '/privacy/settings' }),
      providesTags: ['Privacy'],
    }),
    updatePrivacySettings: build.mutation<PrivacySettingsDto, Partial<PrivacySettingsDto>>({
      query: (data) => ({ url: '/privacy/settings', method: 'PATCH', data }),
      async onQueryStarted(data, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          settingsApi.util.updateQueryData('privacySettings', undefined, (draft) => {
            Object.assign(draft, data);
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: ['Me', 'Profile', 'FollowRequests'],
    }),
    blockedUsers: build.query<Paginated<UserSummary>, void>({
      query: () => ({ url: '/privacy/blocks', params: { limit: 50 } }),
      providesTags: ['Blocks'],
    }),
    setBlock: build.mutation<void, { userId: string; block: boolean }>({
      query: ({ userId, block }) => ({ url: `/privacy/blocks/${userId}`, method: block ? 'POST' : 'DELETE' }),
      invalidatesTags: ['Blocks', 'Profile', 'Feed', 'Stories', 'Reels', 'Suggested', 'Contacts', 'Conversations'],
    }),
    people: build.query<UserSummary[], PeopleList>({
      query: (list) => ({ url: `/privacy/${list}` }),
      providesTags: (_result, _error, list) => [list === 'close-friends' ? 'CloseFriends' : 'StoryHidden'],
    }),
    setPerson: build.mutation<void, { list: PeopleList; userId: string; on: boolean }>({
      query: ({ list, userId, on }) => ({ url: `/privacy/${list}/${userId}`, method: on ? 'PUT' : 'DELETE' }),
      invalidatesTags: (_result, _error, { list }) => [list === 'close-friends' ? 'CloseFriends' : 'StoryHidden'],
    }),
    report: build.mutation<{ id: string }, ReportRequest>({
      query: (data) => ({ url: '/reports', method: 'POST', data }),
    }),
  }),
});

export const {
  useNotificationsPageInfiniteQuery,
  useMarkNotificationReadMutation,
  useNotificationSettingsQuery,
  useUpdateNotificationSettingsMutation,
  usePrivacySettingsQuery,
  useUpdatePrivacySettingsMutation,
  useBlockedUsersQuery,
  useSetBlockMutation,
  usePeopleQuery,
  useSetPersonMutation,
  useReportMutation,
} = settingsApi;
