'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft, ImagePlus, Loader2, Send, Smile, Trash2 } from 'lucide-react';
import {
  IMAGE_MAX_BYTES,
  IMAGE_MIME_TYPES,
  MESSAGE_MAX,
  RealtimeEvents,
  type ConversationDto,
  type MessageDto,
  type MessageType,
  type TypingPayloadDto,
} from '@insta/shared';
import { Link } from '@/i18n/navigation';
import { CallButtons } from '@/components/calls/call-buttons';
import { Avatar } from '@/components/profile/avatar';
import { ErrorState, Spinner } from '@/components/ui/states';
import { mediaUrl } from '@/lib/config';
import { errorStatus } from '@/lib/errors';
import { emitSocket, useSocketEvent } from '@/lib/socket';
import { useRelativeTime } from '@/lib/use-relative-time';
import { cn } from '@/lib/utils';
import { useAppDispatch } from '@/store';
import { useMeQuery, useUploadMediaMutation } from '@/store/api';
import {
  messagesApi,
  useConversationQuery,
  useDeleteMessageMutation,
  useMarkConversationReadMutation,
  useMessagesInfiniteQuery,
  usePresenceQuery,
  useSendMessageMutation,
  useSetReactionMutation,
} from '@/store/messages-api';
import { conversationPeer } from './conversation-list';
import { VoiceRecorder } from './voice-recorder';

const REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '👍'];
const IMAGE_TYPES: readonly string[] = IMAGE_MIME_TYPES;
const TYPING_TIMEOUT_MS = 4000;

function PresenceLine({ userId }: { userId: string }) {
  const t = useTranslations('presence');
  const ago = useRelativeTime();
  const { data } = usePresenceQuery(userId);
  if (!data) {
    return null;
  }
  return (
    <span className="text-xs text-muted-foreground">
      {data.online ? t('online') : data.lastSeenAt ? t('lastSeen', { time: ago(data.lastSeenAt) }) : t('offline')}
    </span>
  );
}

interface BubbleProps {
  message: MessageDto;
  mine: boolean;
  myId: string;
  onReact: (message: MessageDto, emoji: string | null) => void;
  onDelete: (message: MessageDto) => void;
  animate: boolean;
}

function Bubble({ message, mine, myId, onReact, onDelete, animate }: BubbleProps) {
  const t = useTranslations('messages');
  const [picker, setPicker] = useState(false);
  const press = useRef<number | null>(null);
  const myReaction = message.reactions.find((r) => r.userId === myId)?.emoji ?? null;
  const src = message.media ? (mediaUrl(message.media.url) ?? undefined) : undefined;
  const signature = message.reactions.map((r) => `${r.userId}:${r.emoji}`).join(',');
  const firstSignature = useRef(signature);
  const [bounce, setBounce] = useState(0);

  useEffect(() => {
    if (signature !== firstSignature.current) {
      firstSignature.current = signature;
      setBounce((value) => value + 1);
    }
  }, [signature]);

  const startPress = () => {
    press.current = window.setTimeout(() => setPicker(true), 500);
  };
  const endPress = () => {
    if (press.current) {
      window.clearTimeout(press.current);
      press.current = null;
    }
  };

  const grouped = message.reactions.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.emoji]: (acc[r.emoji] ?? 0) + 1 }), {});

  return (
    <li className={cn('group flex flex-col', mine ? 'items-end' : 'items-start', animate && (mine ? 'origin-bottom-right animate-msg-in' : 'origin-bottom-left animate-msg-in'))}>
      <div className={cn('relative flex max-w-[78%] items-center gap-1', mine && 'flex-row-reverse')}>
        <div
          onDoubleClick={() => !message.deleted && onReact(message, myReaction === '❤️' ? null : '❤️')}
          onPointerDown={startPress}
          onPointerUp={endPress}
          onPointerLeave={endPress}
          className={cn(
            'select-none overflow-hidden break-words rounded-3xl text-sm',
            message.type === 'TEXT' || message.deleted || message.type === 'POST_SHARE' ? 'px-4 py-2.5' : 'p-1',
            message.deleted ? 'border italic text-muted-foreground' : mine ? 'bubble-own' : 'bg-muted',
          )}
        >
          {message.deleted ? (
            t('deleted')
          ) : message.type === 'IMAGE' && src ? (
            <img src={src} alt={t('photo')} className="max-h-72 rounded-[20px] object-cover" />
          ) : message.type === 'VIDEO' && src ? (
            <video src={src} controls playsInline className="max-h-72 rounded-[20px]" />
          ) : message.type === 'AUDIO' && src ? (
            <audio src={src} controls preload="metadata" className="h-10 w-60 max-w-full" aria-label={t('voice')} />
          ) : message.type === 'POST_SHARE' && message.sharedPost ? (
            <Link href={`/p/${message.sharedPost.id}`} className="underline">
              {t('sharedPostBy', { username: message.sharedPost.author.username })}
            </Link>
          ) : (
            <span className="whitespace-pre-wrap">{message.content}</span>
          )}
        </div>
        {!message.deleted ? (
          <button
            type="button"
            aria-label={t('react')}
            onClick={() => setPicker((value) => !value)}
            className="rounded-full p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-nav-hover focus-visible:opacity-100 group-hover:opacity-100"
          >
            <Smile className="size-4" />
          </button>
        ) : null}
        {picker ? (
          <div
            role="menu"
            aria-label={t('react')}
            className={cn('absolute bottom-full z-10 mb-1 flex animate-pop-in items-center gap-1 rounded-full border bg-popover px-2 py-1 shadow-xl', mine ? 'right-0 origin-bottom-right' : 'left-0 origin-bottom-left')}
          >
            {REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                role="menuitem"
                aria-pressed={myReaction === emoji}
                onClick={() => {
                  setPicker(false);
                  onReact(message, myReaction === emoji ? null : emoji);
                }}
                className={cn('rounded-full p-1 text-xl transition-transform duration-150 ease-spring hover:scale-125 active:scale-90', myReaction === emoji && 'bg-muted')}
              >
                {emoji}
              </button>
            ))}
            {mine ? (
              <button
                type="button"
                role="menuitem"
                aria-label={t('delete')}
                onClick={() => {
                  setPicker(false);
                  onDelete(message);
                }}
                className="rounded-full p-1.5 text-destructive hover:bg-nav-hover"
              >
                <Trash2 className="size-4" />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      {Object.keys(grouped).length > 0 ? (
        <span key={bounce} className={cn('-mt-1.5 inline-block rounded-full border bg-popover px-1.5 py-0.5 text-xs shadow-sm', bounce > 0 && 'animate-reaction-bounce')}>
          {Object.entries(grouped).map(([emoji, count]) => (
            <span key={emoji}>
              {emoji}
              {count > 1 ? count : ''}
            </span>
          ))}
        </span>
      ) : null}
    </li>
  );
}

function ChatHeader({ conversation, myId }: { conversation: ConversationDto; myId: string }) {
  const t = useTranslations('messages');
  const peer = conversationPeer(conversation, myId);
  return (
    <header className="flex items-center gap-3 border-b px-4 py-3">
      <Link href="/messages" aria-label={t('back')} className="rounded-full p-1 hover:bg-nav-hover md:hidden">
        <ArrowLeft className="size-5" />
      </Link>
      <Link href={`/profile/${peer.username}`} className="flex min-w-0 items-center gap-3">
        <Avatar src={peer.avatarUrl} alt={peer.username} className="size-11" />
        <span className="grid min-w-0">
          <span className="truncate text-sm font-semibold">{conversation.isGroup ? (conversation.title ?? peer.fullName) : peer.fullName}</span>
          {conversation.isGroup ? null : <PresenceLine userId={peer.id} />}
        </span>
      </Link>
      {conversation.isGroup ? null : <CallButtons peer={peer} />}
    </header>
  );
}

export function ChatView({ conversationId }: { conversationId: string }) {
  const t = useTranslations('messages');
  const dispatch = useAppDispatch();
  const { data: me } = useMeQuery();
  const conversation = useConversationQuery(conversationId);
  const query = useMessagesInfiniteQuery(conversationId);
  const [send, sendState] = useSendMessageMutation();
  const [upload, uploadState] = useUploadMediaMutation();
  const [markRead] = useMarkConversationReadMutation();
  const [setReaction] = useSetReactionMutation();
  const [deleteMessage] = useDeleteMessageMutation();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const typingSent = useRef(0);
  const typingStop = useRef<number | null>(null);
  const peerTypingTimer = useRef<number | null>(null);
  const keepPosition = useRef<number | null>(null);

  const messages = [...(query.data?.pages.flatMap((page) => page.items) ?? [])].reverse();
  const lastId = messages[messages.length - 1]?.id;
  const openedAt = useRef(Date.now());
  const myId = me?.id ?? '';

  useEffect(() => {
    void markRead(conversationId);
  }, [conversationId, markRead]);

  useLayoutEffect(() => {
    const node = list.current;
    if (!node) {
      return;
    }
    if (keepPosition.current !== null) {
      node.scrollTop = node.scrollHeight - keepPosition.current;
      keepPosition.current = null;
    } else {
      node.scrollTop = node.scrollHeight;
    }
  }, [lastId, messages.length]);

  useSocketEvent<MessageDto>(RealtimeEvents.MessageNew, (message) => {
    if (message.conversationId === conversationId && message.sender.id !== myId) {
      setPeerTyping(false);
      if (document.visibilityState === 'visible') {
        void markRead(conversationId);
      }
    }
  });

  useSocketEvent<TypingPayloadDto>(RealtimeEvents.Typing, (payload) => {
    if (payload.conversationId !== conversationId || payload.userId === myId) {
      return;
    }
    setPeerTyping(payload.isTyping);
    if (peerTypingTimer.current) {
      window.clearTimeout(peerTypingTimer.current);
    }
    if (payload.isTyping) {
      peerTypingTimer.current = window.setTimeout(() => setPeerTyping(false), TYPING_TIMEOUT_MS + 2000);
    }
  });

  const stopTyping = useCallback(() => {
    if (typingStop.current) {
      window.clearTimeout(typingStop.current);
      typingStop.current = null;
    }
    if (typingSent.current) {
      emitSocket(RealtimeEvents.TypingStop, { conversationId });
      typingSent.current = 0;
    }
  }, [conversationId]);

  useEffect(() => stopTyping, [stopTyping]);

  const onType = (value: string) => {
    setText(value);
    const now = Date.now();
    if (now - typingSent.current > TYPING_TIMEOUT_MS / 2) {
      emitSocket(RealtimeEvents.TypingStart, { conversationId });
      typingSent.current = now;
    }
    if (typingStop.current) {
      window.clearTimeout(typingStop.current);
    }
    typingStop.current = window.setTimeout(stopTyping, TYPING_TIMEOUT_MS);
  };

  const appendOwn = (message: MessageDto) => {
    dispatch(
      messagesApi.util.updateQueryData('messages', conversationId, (draft) => {
        const first = draft.pages[0];
        if (first && !draft.pages.some((page) => page.items.some((m) => m.id === message.id))) {
          first.items.unshift(message);
        }
      }),
    );
  };

  const sendPayload = async (payload: { type?: MessageType; content?: string; mediaId?: string }) => {
    setError(null);
    try {
      const message = await send({ conversationId, ...payload }).unwrap();
      appendOwn(message);
      return true;
    } catch (failure) {
      const status = errorStatus(failure as Parameters<typeof errorStatus>[0]);
      setError(status === 403 ? t('notAllowed') : t('sendFailed'));
      return false;
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const content = text.trim();
    if (!content) {
      return;
    }
    stopTyping();
    setText('');
    if (!(await sendPayload({ content }))) {
      setText((current) => current || content);
    }
  };

  const sendFile = async (file: File, type: MessageType) => {
    setError(null);
    try {
      const media = await upload({ file, purpose: 'MESSAGE' }).unwrap();
      await sendPayload({ type, mediaId: media.id });
    } catch {
      setError(t('uploadFailed'));
    }
  };

  const onReact = (message: MessageDto, emoji: string | null) => {
    void setReaction({ messageId: message.id, emoji })
      .unwrap()
      .catch(() => setError(t('reactFailed')));
  };

  const onDelete = (message: MessageDto) => {
    if (window.confirm(t('confirmDelete'))) {
      void deleteMessage(message.id)
        .unwrap()
        .catch(() => setError(t('deleteFailed')));
    }
  };

  const loadOlder = () => {
    if (list.current) {
      keepPosition.current = list.current.scrollHeight - list.current.scrollTop;
    }
    void query.fetchNextPage();
  };

  if (conversation.isLoading || query.isLoading || !me) {
    return <Spinner className="py-20" />;
  }
  if (conversation.isError || !conversation.data) {
    return <ErrorState message={t('notFound')} />;
  }

  const peer = conversationPeer(conversation.data, myId);
  const lastMine = [...messages].reverse().find((m) => m.sender.id === myId && !m.deleted);
  const lastAll = messages[messages.length - 1];
  const seen = lastMine && lastAll?.id === lastMine.id && peer.lastReadAt && new Date(peer.lastReadAt) >= new Date(lastMine.createdAt);
  const busy = sendState.isLoading || uploadState.isLoading;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ChatHeader conversation={conversation.data} myId={myId} />
      <div ref={list} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {query.hasNextPage ? (
          <div className="mb-3 flex justify-center">
            <button type="button" onClick={loadOlder} disabled={query.isFetchingNextPage} className="text-xs font-semibold text-see-all">
              {query.isFetchingNextPage ? <Loader2 className="size-4 animate-spin" /> : t('loadOlder')}
            </button>
          </div>
        ) : null}
        {messages.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">{t('startChat')}</p> : null}
        <ul className="grid gap-2">
          {messages.map((message) => (
            <Bubble
              key={message.id}
              message={message}
              mine={message.sender.id === myId}
              myId={myId}
              onReact={onReact}
              onDelete={onDelete}
              animate={new Date(message.createdAt).getTime() > openedAt.current - 2000}
            />
          ))}
        </ul>
        {lastMine && lastAll?.id === lastMine.id ? (
          <p className="mt-1 text-right text-[11px] text-muted-foreground">{seen ? t('seen') : t('delivered')}</p>
        ) : null}
        {peerTyping ? (
          <div className="mt-2 flex animate-fade-in items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-2.5" aria-hidden="true">
              {[0, 150, 300].map((delay) => (
                <span key={delay} className="size-1.5 animate-typing-dot rounded-full bg-muted-foreground" style={{ animationDelay: `${delay}ms` }} />
              ))}
            </span>
            <span className="italic">{t('typing', { name: peer.fullName })}</span>
          </div>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="px-4 pb-1 text-xs text-destructive">
          {error}
        </p>
      ) : null}
      <form onSubmit={(event) => void submit(event)} className="flex items-center gap-1 border-t px-3 py-3">
        {recording ? null : (
          <>
            <button type="button" aria-label={t('sendPhoto')} disabled={busy} onClick={() => fileInput.current?.click()} className="rounded-full p-2 hover:bg-nav-hover disabled:opacity-40">
              <ImagePlus className="size-5" />
            </button>
            <input
              ref={fileInput}
              type="file"
              accept={IMAGE_TYPES.join(',')}
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file) {
                  return;
                }
                if (!IMAGE_TYPES.includes(file.type) || file.size > IMAGE_MAX_BYTES) {
                  setError(t('badPhoto'));
                  return;
                }
                void sendFile(file, 'IMAGE');
              }}
            />
            <input
              value={text}
              onChange={(event) => onType(event.target.value)}
              maxLength={MESSAGE_MAX}
              placeholder={t('placeholder')}
              aria-label={t('placeholder')}
              className="h-11 min-w-0 flex-1 rounded-full border border-surface-border bg-surface px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </>
        )}
        <VoiceRecorder disabled={busy} onRecorded={(file) => void sendFile(file, 'AUDIO')} onError={setError} onActiveChange={setRecording} />
        {recording ? null : (
          <button type="submit" aria-label={t('send')} disabled={!text.trim()} className="rounded-full p-2 text-link disabled:opacity-40">
            {busy ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
          </button>
        )}
      </form>
    </div>
  );
}
