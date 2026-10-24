'use client';

export type CallError =
  | 'unsupported'
  | 'mediaDenied'
  | 'cameraDenied'
  | 'cameraBusy'
  | 'noCamera'
  | 'micDenied'
  | 'micBusy'
  | 'noMic'
  | 'offline'
  | 'busy'
  | 'rejected'
  | 'noAnswer'
  | 'notAllowed'
  | 'unavailable'
  | 'failed'
  | 'connectionLost';

export type MediaResult =
  | { ok: true; stream: MediaStream }
  | { ok: false; error: CallError; audioOnly: MediaStream | null };

type DeviceProblem = 'denied' | 'busy' | 'missing';

export const ICE_SERVERS: RTCIceServer[] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];

const AUDIO: MediaTrackConstraints = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
const VIDEO: MediaTrackConstraints = { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } };

const CAMERA_ERRORS: Record<DeviceProblem, CallError> = { denied: 'cameraDenied', busy: 'cameraBusy', missing: 'noCamera' };
const MIC_ERRORS: Record<DeviceProblem, CallError> = { denied: 'micDenied', busy: 'micBusy', missing: 'noMic' };

function deviceProblem(error: unknown): DeviceProblem {
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') {
    return 'denied';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') {
    return 'missing';
  }
  return 'busy';
}

export function callsSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    typeof navigator.mediaDevices?.getUserMedia === 'function' &&
    typeof window.RTCPeerConnection === 'function'
  );
}

export function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

export async function acquireMedia(video: boolean): Promise<MediaResult> {
  if (!callsSupported()) {
    return { ok: false, error: 'unsupported', audioOnly: null };
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO, video: video ? VIDEO : false });
    return { ok: true, stream };
  } catch (error) {
    const problem = deviceProblem(error);
    if (!video) {
      return { ok: false, error: MIC_ERRORS[problem], audioOnly: null };
    }
    try {
      const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: AUDIO });
      return { ok: false, error: CAMERA_ERRORS[problem], audioOnly };
    } catch (micError) {
      const micProblem = deviceProblem(micError);
      return { ok: false, error: problem === 'denied' && micProblem === 'denied' ? 'mediaDenied' : MIC_ERRORS[micProblem], audioOnly: null };
    }
  }
}
