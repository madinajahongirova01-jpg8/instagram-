'use client';

import { useTranslations } from 'next-intl';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatView } from './chat-view';
import { ConversationList } from './conversation-list';

export function MessagesView({ conversationId }: { conversationId?: string }) {
  const t = useTranslations('messages');
  return (
    <div className="post-card grid h-[calc(100dvh-7.5rem)] overflow-hidden md:h-[calc(100dvh-7rem)] md:grid-cols-[320px_1fr] md:rounded-3xl">
      <aside className={cn('min-h-0 border-r', conversationId ? 'hidden md:block' : 'block')}>
        <ConversationList activeId={conversationId} />
      </aside>
      <section className={cn('min-h-0', conversationId ? 'block' : 'hidden md:block')}>
        {conversationId ? (
          <ChatView key={conversationId} conversationId={conversationId} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <span className="flex size-20 items-center justify-center rounded-full border-2 border-foreground">
              <Send className="size-9" strokeWidth={1.5} />
            </span>
            <p className="text-lg font-semibold">{t('pickTitle')}</p>
            <p className="text-sm text-muted-foreground">{t('pickText')}</p>
          </div>
        )}
      </section>
    </div>
  );
}
