import type { ConversationDto, MessageDto, MessageType, Paginated, PresenceDto } from '@insta/shared';
import { api } from './api';

type Cursor = string | null;

export interface SendMessageRequest {
  conversationId: string;
  type?: MessageType;
  content?: string;
  mediaId?: string;
}

export const messagesApi = api.injectEndpoints({
  endpoints: (build) => ({
    conversations: build.query<Paginated<ConversationDto>, void>({
      query: () => ({ url: '/conversations', params: { limit: 50 } }),
      providesTags: ['Conversations'],
    }),
    conversation: build.query<ConversationDto, string>({
      query: (id) => ({ url: `/conversations/${id}` }),
      providesTags: (_result, _error, id) => [{ type: 'Conversations', id }],
    }),
    startConversation: build.mutation<ConversationDto, string>({
      query: (userId) => ({ url: '/conversations', method: 'POST', data: { participantIds: [userId] } }),
      invalidatesTags: ['Conversations', 'Contacts'],
    }),
    messages: build.infiniteQuery<Paginated<MessageDto>, string, Cursor>({
      infiniteQueryOptions: {
        initialPageParam: null,
        getNextPageParam: (last) => last.nextCursor,
      },
      query: ({ queryArg, pageParam }) => ({
        url: `/conversations/${queryArg}/messages`,
        params: pageParam ? { cursor: pageParam, limit: 30 } : { limit: 30 },
      }),
      providesTags: (_result, _error, id) => [{ type: 'Messages', id }],
    }),
    sendMessage: build.mutation<MessageDto, SendMessageRequest>({
      query: ({ conversationId, ...data }) => ({ url: `/conversations/${conversationId}/messages`, method: 'POST', data }),
    }),
    markConversationRead: build.mutation<{ readAt: string }, string>({
      query: (id) => ({ url: `/conversations/${id}/read`, method: 'POST' }),
      invalidatesTags: ['MessagesCount', 'Conversations'],
    }),
    setReaction: build.mutation<void, { messageId: string; emoji: string | null }>({
      query: ({ messageId, emoji }) =>
        emoji
          ? { url: `/messages/${messageId}/reaction`, method: 'PUT', data: { emoji } }
          : { url: `/messages/${messageId}/reaction`, method: 'DELETE' },
    }),
    presence: build.query<PresenceDto, string>({
      query: (userId) => ({ url: `/users/${userId}/presence` }),
    }),
    deleteMessage: build.mutation<void, string>({
      query: (id) => ({ url: `/messages/${id}`, method: 'DELETE' }),
    }),
  }),
});

export const {
  useConversationsQuery,
  useConversationQuery,
  useStartConversationMutation,
  useMessagesInfiniteQuery,
  useSendMessageMutation,
  useMarkConversationReadMutation,
  useSetReactionMutation,
  useDeleteMessageMutation,
  usePresenceQuery,
} = messagesApi;
