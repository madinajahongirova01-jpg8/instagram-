'use client';

import { useTranslations } from 'next-intl';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { Avatar } from '@/components/profile/avatar';
import type { CallView } from './call-provider';

interface IncomingCallProps {
  call: CallView;
  onAccept: () => void;
  onDecline: () => void;
}

export function IncomingCall({ call, onAccept, onDecline }: IncomingCallProps) {
  const t = useTranslations('calls');
  const video = call.type === 'VIDEO';
  const AcceptIcon = video ? Video : Phone;

  return (
    <div className="fixed inset-x-0 top-0 z-70 flex justify-center p-3 sm:top-4">
      <div
        role="alertdialog"
        aria-modal="false"
        aria-label={video ? t('incomingVideo') : t('incomingVoice')}
        className="flex w-full max-w-md animate-pop-in items-center gap-3 rounded-3xl border border-white/10 bg-neutral-900/95 p-4 text-white shadow-2xl backdrop-blur"
      >
        <span className="relative">
          <span className="absolute inset-0 animate-ping rounded-full bg-white/20" aria-hidden="true" />
          <Avatar src={call.peer.avatarUrl} alt={call.peer.username} className="relative size-12" />
        </span>
        <span className="grid min-w-0 flex-1">
          <span className="truncate text-sm font-semibold">{call.peer.fullName}</span>
          <span className="flex items-center gap-1 text-xs text-white/70">
            {video ? <Video className="size-3.5" /> : <Phone className="size-3.5" />}
            {video ? t('incomingVideo') : t('incomingVoice')}
          </span>
        </span>
        <button
          type="button"
          onClick={onDecline}
          aria-label={t('decline')}
          className="flex size-11 items-center justify-center rounded-full bg-red-500 transition-transform hover:bg-red-600 active:scale-90"
        >
          <PhoneOff className="size-5" />
        </button>
        <button
          type="button"
          onClick={onAccept}
          aria-label={t('accept')}
          autoFocus
          className="flex size-11 items-center justify-center rounded-full bg-green-500 transition-transform hover:bg-green-600 active:scale-90"
        >
          <AcceptIcon className="size-5" />
        </button>
      </div>
    </div>
  );
}
