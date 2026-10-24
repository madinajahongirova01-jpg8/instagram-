'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react';
import { Avatar } from '@/components/profile/avatar';
import { cn } from '@/lib/utils';
import { useCall, type CallView } from './call-provider';
import { LocalPreview } from './local-preview';
import { hasLiveVideo, useCallDuration, useStreamElement } from './use-call-media';

interface ControlProps {
  label: string;
  onClick: () => void;
  off?: boolean;
  danger?: boolean;
  children: ReactNode;
}

function Control({ label, onClick, off = false, danger = false, children }: ControlProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={danger ? undefined : off}
      title={label}
      className={cn(
        'flex size-14 items-center justify-center rounded-full transition-transform active:scale-90',
        danger ? 'bg-red-500 text-white hover:bg-red-600' : off ? 'bg-white text-neutral-900' : 'bg-white/15 text-white hover:bg-white/25',
      )}
    >
      {children}
    </button>
  );
}

function useStatus(call: CallView | null, duration: string | null): string {
  const t = useTranslations('calls');
  if (!call) {
    return '';
  }
  if (call.error) {
    return t(`errors.${call.error}`, { name: call.peer.fullName });
  }
  switch (call.phase) {
    case 'preparing':
      return t('starting');
    case 'outgoing':
      return t('calling');
    case 'connecting':
      return t('connecting');
    case 'active':
      return duration ?? '0:00';
    case 'ended':
      return t('ended');
    default:
      return '';
  }
}

export function CallScreen() {
  const t = useTranslations('calls');
  const { call, localStream, remoteStream, hangUp, toggleMic, toggleCamera, continueAsVoice, dismiss } = useCall();
  const remoteAudio = useStreamElement<HTMLAudioElement>(remoteStream);
  const remoteVideo = useStreamElement<HTMLVideoElement>(remoteStream);
  const duration = useCallDuration(call?.startedAt ?? null);
  const status = useStatus(call, duration);

  if (!call || call.phase === 'incoming') {
    return null;
  }

  const video = call.type === 'VIDEO';
  const active = call.phase === 'active';
  const ended = call.phase === 'ended';
  const showRemoteVideo = video && active && call.remoteCameraOn && hasLiveVideo(remoteStream);
  const showLocal = video && hasLiveVideo(localStream) && !ended;
  const live = !ended && call.phase !== 'cameraFailed';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={video ? t('videoCall') : t('voiceCall')}
      className="fixed inset-0 z-70 flex animate-overlay-in flex-col overflow-hidden bg-neutral-950 text-white"
    >
      <audio ref={remoteAudio} autoPlay />
      <video
        ref={remoteVideo}
        autoPlay
        playsInline
        muted
        className={cn('absolute inset-0 size-full bg-black object-cover', !showRemoteVideo && 'invisible')}
      />
      {showLocal ? <LocalPreview stream={localStream} cameraOn={call.cameraOn} fullscreen={!active} label={t('you')} /> : null}

      <header
        className={cn(
          'relative z-1 flex flex-col items-center gap-1 px-6 pt-10 text-center',
          showRemoteVideo && 'items-start bg-linear-to-b from-black/60 to-transparent pb-10 pt-6 text-left',
        )}
      >
        {showRemoteVideo ? null : (
          <Avatar src={call.peer.avatarUrl} alt={call.peer.username} className={cn('mb-3 size-28 ring-4 ring-white/10', call.phase === 'outgoing' && 'animate-pulse')} />
        )}
        <h2 className="text-xl font-semibold drop-shadow">{call.peer.fullName}</h2>
        <p role="status" aria-live="polite" className={cn('text-sm text-white/80 drop-shadow', call.error && 'text-red-300')}>
          {status}
        </p>
        {video && active && !call.remoteCameraOn ? <p className="text-xs text-white/60">{t('peerCameraOff')}</p> : null}
        {active && !call.remoteMicOn ? (
          <p className="flex items-center gap-1 text-xs text-white/60">
            <MicOff className="size-3.5" />
            {t('peerMuted', { name: call.peer.fullName })}
          </p>
        ) : null}
      </header>

      <div className="flex-1" />

      {call.phase === 'cameraFailed' ? (
        <div className="relative z-1 mx-4 mb-6 grid gap-3 self-center rounded-3xl bg-neutral-900/95 p-5 text-center shadow-2xl sm:w-96">
          <p className="text-base font-semibold">{t('cameraProblem')}</p>
          <button type="button" onClick={continueAsVoice} className="h-11 rounded-xl bg-white font-semibold text-neutral-900 hover:bg-white/90">
            {t('continueVoice')}
          </button>
          <button type="button" onClick={hangUp} className="h-11 rounded-xl bg-white/10 font-semibold hover:bg-white/20">
            {t('cancel')}
          </button>
        </div>
      ) : null}

      {ended ? (
        <div className="relative z-1 flex justify-center pb-12">
          <button type="button" onClick={dismiss} className="h-11 rounded-full bg-white/15 px-8 font-semibold hover:bg-white/25">
            {t('close')}
          </button>
        </div>
      ) : null}

      {live ? (
        <footer className="relative z-1 flex items-center justify-center gap-5 bg-linear-to-t from-black/60 to-transparent pb-10 pt-8">
          <Control label={call.micOn ? t('mute') : t('unmute')} onClick={toggleMic} off={!call.micOn}>
            {call.micOn ? <Mic className="size-6" /> : <MicOff className="size-6" />}
          </Control>
          {video && hasLiveVideo(localStream) ? (
            <Control label={call.cameraOn ? t('cameraOff') : t('cameraOn')} onClick={toggleCamera} off={!call.cameraOn}>
              {call.cameraOn ? <Video className="size-6" /> : <VideoOff className="size-6" />}
            </Control>
          ) : null}
          <Control label={t('end')} onClick={hangUp} danger>
            <PhoneOff className="size-6" />
          </Control>
        </footer>
      ) : null}
    </div>
  );
}
