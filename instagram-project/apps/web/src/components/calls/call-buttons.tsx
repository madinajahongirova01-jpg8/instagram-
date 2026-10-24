'use client';

import { useTranslations } from 'next-intl';
import { Phone, Video } from 'lucide-react';
import type { UserSummary } from '@insta/shared';
import { useCall } from './call-provider';

export function CallButtons({ peer }: { peer: UserSummary }) {
  const t = useTranslations('calls');
  const { call, startCall } = useCall();
  const busy = Boolean(call && call.phase !== 'ended');
  const target: UserSummary = { id: peer.id, username: peer.username, fullName: peer.fullName, avatarUrl: peer.avatarUrl, isVerified: peer.isVerified };

  return (
    <div className="ml-auto flex shrink-0 items-center gap-1">
      <button
        type="button"
        aria-label={t('voiceCall')}
        title={t('voiceCall')}
        disabled={busy}
        onClick={() => startCall(target, 'VOICE')}
        className="rounded-full p-2 transition-transform hover:bg-nav-hover active:scale-90 disabled:opacity-40"
      >
        <Phone className="size-6" />
      </button>
      <button
        type="button"
        aria-label={t('videoCall')}
        title={t('videoCall')}
        disabled={busy}
        onClick={() => startCall(target, 'VIDEO')}
        className="rounded-full p-2 transition-transform hover:bg-nav-hover active:scale-90 disabled:opacity-40"
      >
        <Video className="size-6" />
      </button>
    </div>
  );
}
