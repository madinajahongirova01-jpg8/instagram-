'use client';

import { useEffect } from 'react';
import { useStore } from 'react-redux';
import {
  RealtimeEvents,
  type ConversationReadPayload,
  type MessageDeletedPayload,
  type MessageDto,
  type MessageReactionPayload,
  type NotificationDto,
  type PresencePayload,
} from '@insta/shared';
import { connectSocket, disconnectSocket, onSocket } from '@/lib/socket';
import { api } from '@/store/api';
import { messagesApi } from '@/store/messages-api';
import { useAppDispatch, useAppSelector, type RootState } from '@/store';

export function RealtimeProvider() {
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();
  const authenticated = useAppSelector((state) => state.auth.status === 'authenticated');

  useEffect(() => {
    if (!authenticated) {
      return;
    }
    connectSocket(() => store.getState().auth.accessToken);

    const setPresence = (online: boolean) => (raw: unknown) => {
      const payload = raw as PresencePayload;
      dispatch(
        api.util.updateQueryData('contacts', undefined, (draft) => {
          const contact = draft.find((c) => c.id === payload.userId);
          if (contact) {
            contact.online = online;
            if (!online) {
              contact.lastSeenAt = payload.at;
            }
          }
        }),
      );
      dispatch(
        messagesApi.util.updateQueryData('presence', payload.userId, (draft) => {
          draft.online = online;
          if (!online) {
            draft.lastSeenAt = payload.at;
          }
        }),
      );
    };

    const updateMessage = (conversationId: string, messageId: string, recipe: (message: MessageDto) => void) => {
      dispatch(
        messagesApi.util.updateQueryData('messages', conversationId, (draft) => {
          for (const page of draft.pages) {
            const message = page.items.find((m) => m.id === messageId);
            if (message) {
              recipe(message);
            }
          }
        }),
      );
    };

    const unsubscribe = [
      onSocket(RealtimeEvents.NotificationNew, (raw) => {
        const notification = raw as NotificationDto;
        dispatch(api.util.invalidateTags(['Notifications', 'NotificationsCount']));
        if (notification.type === 'FOLLOW' || notification.type === 'FOLLOW_ACCEPTED' || notification.type === 'FOLLOW_REQUEST') {
          dispatch(api.util.invalidateTags(['Profile', 'FollowRequests']));
        }
        if ((notification.type === 'LIKE' || notification.type === 'COMMENT') && notification.entityId) {
          dispatch(
            api.util.invalidateTags([
              { type: 'Post', id: notification.entityId },
              { type: 'Comments', id: notification.entityId },
            ]),
          );
        }
      }),
      onSocket(RealtimeEvents.MessageNew, (raw) => {
        const message = raw as MessageDto;
        dispatch(
          messagesApi.util.updateQueryData('messages', message.conversationId, (draft) => {
            const first = draft.pages[0];
            if (first && !draft.pages.some((page) => page.items.some((m) => m.id === message.id))) {
              first.items.unshift(message);
            }
          }),
        );
        dispatch(api.util.invalidateTags(['MessagesCount', 'Contacts', 'Conversations']));
      }),
      onSocket(RealtimeEvents.MessageDeleted, (raw) => {
        const payload = raw as MessageDeletedPayload;
        updateMessage(payload.conversationId, payload.messageId, (message) => {
          message.deleted = true;
          message.content = null;
          message.media = null;
          message.reactions = [];
        });
        dispatch(api.util.invalidateTags(['Conversations']));
      }),
      onSocket(RealtimeEvents.MessageReaction, (raw) => {
        const payload = raw as MessageReactionPayload;
        updateMessage(payload.conversationId, payload.messageId, (message) => {
          message.reactions = message.reactions.filter((r) => r.userId !== payload.userId);
          if (payload.emoji) {
            message.reactions.push({ userId: payload.userId, emoji: payload.emoji });
          }
        });
      }),
      onSocket(RealtimeEvents.ConversationRead, (raw) => {
        const payload = raw as ConversationReadPayload;
        dispatch(
          messagesApi.util.updateQueryData('conversation', payload.conversationId, (draft) => {
            const participant = draft.participants.find((p) => p.id === payload.userId);
            if (participant) {
              participant.lastReadAt = payload.readAt;
            }
          }),
        );
      }),
      onSocket(RealtimeEvents.PresenceOnline, setPresence(true)),
      onSocket(RealtimeEvents.PresenceOffline, setPresence(false)),
    ];

    return () => {
      unsubscribe.forEach((off) => off());
      disconnectSocket();
    };
  }, [authenticated, dispatch, store]);

  return null;
}
