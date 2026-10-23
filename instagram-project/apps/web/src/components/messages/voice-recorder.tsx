'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Mic, Trash2 } from 'lucide-react';
import { AUDIO_MAX_BYTES } from '@insta/shared';

const MAX_SECONDS = 120;
const CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];

function pickMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') {
    return null;
  }
  return CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

interface VoiceRecorderProps {
  disabled?: boolean;
  onRecorded: (file: File) => void;
  onError: (message: string) => void;
  onActiveChange: (active: boolean) => void;
}

export function VoiceRecorder({ disabled, onRecorded, onError, onActiveChange }: VoiceRecorderProps) {
  const t = useTranslations('messages');
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const discard = useRef(false);
  const stream = useRef<MediaStream | null>(null);

  const cleanup = () => {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    recorder.current = null;
    setRecording(false);
    setSeconds(0);
    onActiveChange(false);
  };

  useEffect(() => {
    if (!recording) {
      return;
    }
    const timer = window.setInterval(() => {
      setSeconds((value) => {
        if (value + 1 >= MAX_SECONDS) {
          recorder.current?.stop();
        }
        return value + 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [recording]);

  useEffect(
    () => () => {
      discard.current = true;
      recorder.current?.stop();
      stream.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  const start = async () => {
    const mimeType = pickMimeType();
    if (!mimeType || !navigator.mediaDevices?.getUserMedia) {
      onError(t('voiceUnsupported'));
      return;
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      onError(t('micDenied'));
      return;
    }
    chunks.current = [];
    discard.current = false;
    const media = new MediaRecorder(stream.current, { mimeType });
    media.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.current.push(event.data);
      }
    };
    media.onstop = () => {
      const type = mimeType.split(';')[0];
      const blob = new Blob(chunks.current, { type });
      const cancelled = discard.current;
      cleanup();
      if (cancelled || blob.size === 0) {
        return;
      }
      if (blob.size > AUDIO_MAX_BYTES) {
        onError(t('voiceTooLong'));
        return;
      }
      const extension = type === 'audio/mp4' ? 'm4a' : type === 'audio/ogg' ? 'ogg' : 'webm';
      onRecorded(new File([blob], `voice.${extension}`, { type }));
    };
    recorder.current = media;
    media.start();
    setRecording(true);
    onActiveChange(true);
  };

  const stop = (cancel: boolean) => {
    discard.current = cancel;
    recorder.current?.stop();
  };

  if (!recording) {
    return (
      <button type="button" disabled={disabled} aria-label={t('recordVoice')} onClick={() => void start()} className="rounded-full p-2 hover:bg-nav-hover disabled:opacity-40">
        <Mic className="size-5" />
      </button>
    );
  }

  return (
    <div className="flex flex-1 items-center gap-3" role="status" aria-live="polite">
      <button type="button" aria-label={t('cancelVoice')} onClick={() => stop(true)} className="rounded-full p-2 text-destructive hover:bg-nav-hover">
        <Trash2 className="size-5" />
      </button>
      <span className="size-2.5 animate-pulse rounded-full bg-destructive" aria-hidden="true" />
      <span className="flex-1 text-sm tabular-nums">
        {t('recording')} {formatTime(seconds)}
      </span>
      <button type="button" aria-label={t('sendVoice')} onClick={() => stop(false)} className="btn-follow rounded-full p-2">
        <Check className="size-5" />
      </button>
    </div>
  );
}
