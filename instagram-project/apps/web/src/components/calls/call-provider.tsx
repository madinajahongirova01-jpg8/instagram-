'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  RealtimeEvents,
  type CallAnswerEvent,
  type CallEndEvent,
  type CallIceEvent,
  type CallOfferEvent,
  type CallOfferPayload,
  type CallRejectEvent,
  type CallRejectPayload,
  type CallType,
  type UserSummary,
} from '@insta/shared';
import { emitSocket, emitSocketWithAck, onSocket } from '@/lib/socket';
import { useAppSelector } from '@/store';
import { acquireMedia, ICE_SERVERS, stopStream, type CallError } from './call-media';

export type CallPhase = 'preparing' | 'cameraFailed' | 'outgoing' | 'incoming' | 'connecting' | 'active' | 'ended';

export interface CallView {
  phase: CallPhase;
  type: CallType;
  direction: 'outgoing' | 'incoming';
  peer: UserSummary;
  startedAt: number | null;
  micOn: boolean;
  cameraOn: boolean;
  remoteMicOn: boolean;
  remoteCameraOn: boolean;
  error: CallError | null;
}

interface CallContextValue {
  call: CallView | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  startCall: (peer: UserSummary, type: CallType) => void;
  accept: () => void;
  decline: () => void;
  hangUp: () => void;
  toggleMic: () => void;
  toggleCamera: () => void;
  continueAsVoice: () => void;
  dismiss: () => void;
}

interface Session {
  pc: RTCPeerConnection | null;
  channel: RTCDataChannel | null;
  local: MediaStream | null;
  remote: MediaStream | null;
  fallback: MediaStream | null;
  offerSdp: string | null;
  pendingIce: RTCIceCandidateInit[];
  ringTimer: number | null;
  graceTimer: number | null;
}

interface ControlMessage {
  kind: 'state';
  mic: boolean;
  camera: boolean;
}

const RING_TIMEOUT_MS = 45_000;
const RECONNECT_GRACE_MS = 8_000;
const ENDED_VISIBLE_MS = 1_500;

const CallContext = createContext<CallContextValue | null>(null);

function emptySession(): Session {
  return { pc: null, channel: null, local: null, remote: null, fallback: null, offerSdp: null, pendingIce: [], ringTimer: null, graceTimer: null };
}

function parseControl(data: unknown): ControlMessage | null {
  if (typeof data !== 'string') {
    return null;
  }
  try {
    const value = JSON.parse(data) as Partial<ControlMessage>;
    return value.kind === 'state' && typeof value.mic === 'boolean' && typeof value.camera === 'boolean' ? { kind: 'state', mic: value.mic, camera: value.camera } : null;
  } catch {
    return null;
  }
}

function parseCandidate(raw: string): RTCIceCandidateInit | null {
  try {
    const value = JSON.parse(raw) as RTCIceCandidateInit;
    return typeof value.candidate === 'string' ? value : null;
  } catch {
    return null;
  }
}

function offerError(error: string | undefined): CallError {
  if (error === 'User is offline') {
    return 'offline';
  }
  if (error === 'User does not accept calls from you') {
    return 'notAllowed';
  }
  if (error === 'User is not available') {
    return 'unavailable';
  }
  return 'failed';
}

function newCall(peer: UserSummary, type: CallType, direction: CallView['direction'], phase: CallPhase): CallView {
  const video = type === 'VIDEO';
  return { phase, type, direction, peer, startedAt: null, micOn: true, cameraOn: video, remoteMicOn: true, remoteCameraOn: video, error: null };
}

export function CallProvider({ children }: { children: ReactNode }) {
  const authenticated = useAppSelector((state) => state.auth.status === 'authenticated');
  const [call, setCall] = useState<CallView | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const callRef = useRef<CallView | null>(null);
  const session = useRef<Session>(emptySession());
  const generation = useRef(0);
  const endedTimer = useRef<number | null>(null);

  const commit = useCallback((next: CallView | null) => {
    callRef.current = next;
    setCall(next);
  }, []);

  const patch = useCallback(
    (changes: Partial<CallView>) => {
      if (callRef.current) {
        commit({ ...callRef.current, ...changes });
      }
    },
    [commit],
  );

  const clearEndedTimer = useCallback(() => {
    if (endedTimer.current) {
      window.clearTimeout(endedTimer.current);
      endedTimer.current = null;
    }
  }, []);

  const release = useCallback(() => {
    generation.current += 1;
    const s = session.current;
    if (s.ringTimer) {
      window.clearTimeout(s.ringTimer);
    }
    if (s.graceTimer) {
      window.clearTimeout(s.graceTimer);
    }
    if (s.channel) {
      s.channel.onopen = null;
      s.channel.onmessage = null;
      s.channel.close();
    }
    if (s.pc) {
      s.pc.onicecandidate = null;
      s.pc.ontrack = null;
      s.pc.onconnectionstatechange = null;
      s.pc.ondatachannel = null;
      s.pc.close();
    }
    stopStream(s.local);
    stopStream(s.fallback);
    stopStream(s.remote);
    session.current = emptySession();
    setLocalStream(null);
    setRemoteStream(null);
  }, []);

  const dismiss = useCallback(() => {
    clearEndedTimer();
    release();
    commit(null);
  }, [clearEndedTimer, commit, release]);

  const finish = useCallback(
    (error: CallError | null, notifyPeer: boolean) => {
      const current = callRef.current;
      if (!current || current.phase === 'ended') {
        return;
      }
      if (notifyPeer) {
        emitSocket(RealtimeEvents.CallEnd, { toUserId: current.peer.id });
      }
      release();
      commit({ ...current, phase: 'ended', error });
      clearEndedTimer();
      if (!error) {
        endedTimer.current = window.setTimeout(() => {
          endedTimer.current = null;
          commit(null);
        }, ENDED_VISIBLE_MS);
      }
    },
    [clearEndedTimer, commit, release],
  );

  const sendState = useCallback(() => {
    const channel = session.current.channel;
    const current = callRef.current;
    if (channel?.readyState === 'open' && current) {
      const message: ControlMessage = { kind: 'state', mic: current.micOn, camera: current.cameraOn };
      channel.send(JSON.stringify(message));
    }
  }, []);

  const attachChannel = useCallback(
    (channel: RTCDataChannel) => {
      session.current.channel = channel;
      channel.onopen = sendState;
      channel.onmessage = (event: MessageEvent) => {
        const message = parseControl(event.data);
        if (message) {
          patch({ remoteMicOn: message.mic, remoteCameraOn: message.camera });
        }
      };
    },
    [patch, sendState],
  );

  const flushIce = useCallback(() => {
    const s = session.current;
    if (!s.pc?.remoteDescription) {
      return;
    }
    const pending = s.pendingIce;
    s.pendingIce = [];
    pending.forEach((candidate) => {
      void s.pc?.addIceCandidate(candidate).catch(() => undefined);
    });
  }, []);

  const createPeer = useCallback(
    (peerId: string) => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          emitSocket(RealtimeEvents.CallIceCandidate, { toUserId: peerId, candidate: JSON.stringify(event.candidate.toJSON()) });
        }
      };
      pc.ontrack = (event) => {
        const remote = session.current.remote ?? new MediaStream();
        if (!remote.getTracks().includes(event.track)) {
          remote.addTrack(event.track);
        }
        session.current.remote = remote;
        setRemoteStream(new MediaStream(remote.getTracks()));
      };
      pc.onconnectionstatechange = () => {
        const s = session.current;
        if (pc.connectionState === 'connected') {
          if (s.graceTimer) {
            window.clearTimeout(s.graceTimer);
            s.graceTimer = null;
          }
          if (callRef.current && callRef.current.phase !== 'active') {
            patch({ phase: 'active', startedAt: callRef.current.startedAt ?? Date.now() });
          }
        } else if (pc.connectionState === 'failed') {
          finish('connectionLost', true);
        } else if (pc.connectionState === 'disconnected' && !s.graceTimer) {
          s.graceTimer = window.setTimeout(() => finish('connectionLost', true), RECONNECT_GRACE_MS);
        }
      };
      session.current.pc = pc;
      return pc;
    },
    [finish, patch],
  );

  const adoptLocal = useCallback((stream: MediaStream) => {
    session.current.local = stream;
    setLocalStream(stream);
  }, []);

  const dial = useCallback(
    async (stream: MediaStream) => {
      const current = callRef.current;
      if (!current) {
        stopStream(stream);
        return;
      }
      const token = generation.current;
      adoptLocal(stream);
      const pc = createPeer(current.peer.id);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      attachChannel(pc.createDataChannel('control'));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (token !== generation.current) {
        return;
      }
      patch({ phase: 'outgoing', error: null, cameraOn: stream.getVideoTracks().length > 0 });
      const payload: CallOfferPayload = { toUserId: current.peer.id, callType: current.type, sdp: offer.sdp ?? '' };
      const ack = await emitSocketWithAck(RealtimeEvents.CallOffer, payload);
      if (token !== generation.current) {
        return;
      }
      if (!ack.ok) {
        finish(offerError(ack.error), false);
        return;
      }
      session.current.ringTimer = window.setTimeout(() => finish('noAnswer', true), RING_TIMEOUT_MS);
    },
    [attachChannel, createPeer, finish, patch, adoptLocal],
  );

  const answer = useCallback(
    async (stream: MediaStream) => {
      const current = callRef.current;
      const offerSdp = session.current.offerSdp;
      if (!current || !offerSdp) {
        stopStream(stream);
        return;
      }
      const token = generation.current;
      adoptLocal(stream);
      const pc = createPeer(current.peer.id);
      pc.ondatachannel = (event) => attachChannel(event.channel);
      await pc.setRemoteDescription({ type: 'offer', sdp: offerSdp });
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      const reply = await pc.createAnswer();
      await pc.setLocalDescription(reply);
      if (token !== generation.current) {
        return;
      }
      flushIce();
      patch({ phase: 'connecting', error: null, cameraOn: stream.getVideoTracks().length > 0 });
      const ack = await emitSocketWithAck(RealtimeEvents.CallAnswer, { toUserId: current.peer.id, sdp: reply.sdp ?? '' });
      if (token === generation.current && !ack.ok) {
        finish('connectionLost', false);
      }
    },
    [attachChannel, createPeer, finish, flushIce, patch, adoptLocal],
  );

  const run = useCallback(
    (task: () => Promise<void>) => {
      task().catch(() => finish('failed', true));
    },
    [finish],
  );

  const prepareMedia = useCallback(
    async (onReady: (stream: MediaStream) => Promise<void>) => {
      const current = callRef.current;
      if (!current) {
        return;
      }
      const token = generation.current;
      const media = await acquireMedia(current.type === 'VIDEO');
      if (token !== generation.current) {
        stopStream(media.ok ? media.stream : media.audioOnly);
        return;
      }
      if (media.ok) {
        await onReady(media.stream);
        return;
      }
      if (media.audioOnly) {
        session.current.fallback = media.audioOnly;
        patch({ phase: 'cameraFailed', error: media.error });
        return;
      }
      finish(media.error, current.direction === 'incoming');
    },
    [finish, patch],
  );

  const startCall = useCallback(
    (peer: UserSummary, type: CallType) => {
      if (callRef.current && callRef.current.phase !== 'ended') {
        return;
      }
      dismiss();
      commit(newCall(peer, type, 'outgoing', 'preparing'));
      run(() => prepareMedia(dial));
    },
    [commit, dial, dismiss, prepareMedia, run],
  );

  const accept = useCallback(() => {
    const current = callRef.current;
    if (current?.phase !== 'incoming') {
      return;
    }
    if (session.current.ringTimer) {
      window.clearTimeout(session.current.ringTimer);
      session.current.ringTimer = null;
    }
    patch({ phase: 'connecting' });
    run(() => prepareMedia(answer));
  }, [answer, patch, prepareMedia, run]);

  const decline = useCallback(() => {
    const current = callRef.current;
    if (current?.phase !== 'incoming') {
      return;
    }
    const payload: CallRejectPayload = { toUserId: current.peer.id, reason: 'REJECTED' };
    emitSocket(RealtimeEvents.CallReject, payload);
    dismiss();
  }, [dismiss]);

  const hangUp = useCallback(() => {
    const current = callRef.current;
    if (!current) {
      return;
    }
    if (current.phase === 'incoming') {
      decline();
      return;
    }
    if (current.phase === 'ended') {
      dismiss();
      return;
    }
    if (current.direction === 'outgoing' && (current.phase === 'preparing' || current.phase === 'cameraFailed')) {
      dismiss();
      return;
    }
    if (current.direction === 'incoming' && current.phase === 'cameraFailed') {
      emitSocket(RealtimeEvents.CallEnd, { toUserId: current.peer.id });
      dismiss();
      return;
    }
    finish(null, true);
  }, [decline, dismiss, finish]);

  const continueAsVoice = useCallback(() => {
    const current = callRef.current;
    const stream = session.current.fallback;
    if (current?.phase !== 'cameraFailed' || !stream) {
      return;
    }
    session.current.fallback = null;
    if (current.direction === 'outgoing') {
      patch({ phase: 'preparing', type: 'VOICE', cameraOn: false, remoteCameraOn: false, error: null });
      run(() => dial(stream));
    } else {
      patch({ phase: 'connecting', cameraOn: false, error: null });
      run(() => answer(stream));
    }
  }, [answer, dial, patch, run]);

  const toggleTracks = useCallback(
    (kind: 'audio' | 'video') => {
      const current = callRef.current;
      const local = session.current.local;
      const tracks = kind === 'audio' ? local?.getAudioTracks() : local?.getVideoTracks();
      if (!current || !tracks || tracks.length === 0) {
        return;
      }
      const enabled = !(kind === 'audio' ? current.micOn : current.cameraOn);
      tracks.forEach((track) => {
        track.enabled = enabled;
      });
      patch(kind === 'audio' ? { micOn: enabled } : { cameraOn: enabled });
      sendState();
    },
    [patch, sendState],
  );

  const toggleMic = useCallback(() => toggleTracks('audio'), [toggleTracks]);
  const toggleCamera = useCallback(() => toggleTracks('video'), [toggleTracks]);

  useEffect(() => {
    const isPeer = (userId: string) => callRef.current?.peer.id === userId && callRef.current.phase !== 'ended';

    const unsubscribe = [
      onSocket(RealtimeEvents.CallOffer, (raw) => {
        const offer = raw as CallOfferEvent;
        if (callRef.current && callRef.current.phase !== 'ended') {
          const payload: CallRejectPayload = { toUserId: offer.fromUserId, reason: 'BUSY' };
          emitSocket(RealtimeEvents.CallReject, payload);
          return;
        }
        dismiss();
        session.current.offerSdp = offer.sdp;
        commit(newCall(offer.from, offer.callType, 'incoming', 'incoming'));
        session.current.ringTimer = window.setTimeout(() => {
          if (callRef.current?.phase === 'incoming') {
            dismiss();
          }
        }, RING_TIMEOUT_MS + 5_000);
      }),
      onSocket(RealtimeEvents.CallAnswer, (raw) => {
        const event = raw as CallAnswerEvent;
        const pc = session.current.pc;
        if (!isPeer(event.fromUserId) || callRef.current?.direction !== 'outgoing' || !pc) {
          return;
        }
        if (session.current.ringTimer) {
          window.clearTimeout(session.current.ringTimer);
          session.current.ringTimer = null;
        }
        patch({ phase: 'connecting' });
        run(async () => {
          await pc.setRemoteDescription({ type: 'answer', sdp: event.sdp });
          flushIce();
        });
      }),
      onSocket(RealtimeEvents.CallIceCandidate, (raw) => {
        const event = raw as CallIceEvent;
        const candidate = parseCandidate(event.candidate);
        if (!isPeer(event.fromUserId) || !candidate) {
          return;
        }
        const pc = session.current.pc;
        if (pc?.remoteDescription) {
          void pc.addIceCandidate(candidate).catch(() => undefined);
        } else {
          session.current.pendingIce.push(candidate);
        }
      }),
      onSocket(RealtimeEvents.CallReject, (raw) => {
        const event = raw as CallRejectEvent;
        if (isPeer(event.fromUserId) && callRef.current?.direction === 'outgoing') {
          finish(event.reason === 'BUSY' ? 'busy' : 'rejected', false);
        }
      }),
      onSocket(RealtimeEvents.CallEnd, (raw) => {
        const event = raw as CallEndEvent;
        if (!isPeer(event.fromUserId)) {
          return;
        }
        if (callRef.current?.phase === 'incoming') {
          dismiss();
          return;
        }
        finish(null, false);
      }),
    ];
    return () => unsubscribe.forEach((off) => off());
  }, [commit, dismiss, finish, flushIce, patch, run]);

  useEffect(() => {
    if (!authenticated && callRef.current) {
      dismiss();
    }
  }, [authenticated, dismiss]);

  useEffect(() => {
    const onLeave = () => {
      const current = callRef.current;
      if (!current || current.phase === 'ended') {
        return;
      }
      if (current.phase === 'incoming') {
        emitSocket(RealtimeEvents.CallReject, { toUserId: current.peer.id, reason: 'REJECTED' });
      } else {
        emitSocket(RealtimeEvents.CallEnd, { toUserId: current.peer.id });
      }
      release();
    };
    window.addEventListener('pagehide', onLeave);
    return () => {
      window.removeEventListener('pagehide', onLeave);
      clearEndedTimer();
      release();
    };
  }, [clearEndedTimer, release]);

  const value = useMemo<CallContextValue>(
    () => ({ call, localStream, remoteStream, startCall, accept, decline, hangUp, toggleMic, toggleCamera, continueAsVoice, dismiss }),
    [call, localStream, remoteStream, startCall, accept, decline, hangUp, toggleMic, toggleCamera, continueAsVoice, dismiss],
  );

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCall(): CallContextValue {
  const value = useContext(CallContext);
  if (!value) {
    throw new Error('useCall must be used inside CallProvider');
  }
  return value;
}
