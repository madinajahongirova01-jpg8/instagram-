'use client';

import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { RealtimeAck } from '@insta/shared';
import { API_ORIGIN } from './config';

type Handler = (payload: unknown) => void;

const handlers = new Map<string, Set<Handler>>();
let socket: Socket | null = null;

export function connectSocket(getToken: () => string | null): Socket {
  if (socket) {
    return socket;
  }
  socket = io(API_ORIGIN, {
    transports: ['websocket'],
    auth: (cb) => cb({ token: getToken() ?? '' }),
  });
  socket.onAny((event: string, payload: unknown) => {
    handlers.get(event)?.forEach((handler) => handler(payload));
  });
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

export function emitSocket(event: string, payload: unknown): void {
  socket?.emit(event, payload);
}

export async function emitSocketWithAck(event: string, payload: unknown, timeoutMs = 10_000): Promise<RealtimeAck> {
  if (!socket?.connected) {
    return { ok: false, error: 'Not connected' };
  }
  try {
    return (await socket.timeout(timeoutMs).emitWithAck(event, payload)) as RealtimeAck;
  } catch {
    return { ok: false, error: 'Timeout' };
  }
}

export function onSocket(event: string, handler: Handler): () => void {
  const set = handlers.get(event) ?? new Set<Handler>();
  set.add(handler);
  handlers.set(event, set);
  return () => {
    set.delete(handler);
  };
}

export function useSocketEvent<T>(event: string, handler: (payload: T) => void): void {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => onSocket(event, (payload) => ref.current(payload as T)), [event]);
}
