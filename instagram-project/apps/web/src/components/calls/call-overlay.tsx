'use client';

import { useCall } from './call-provider';
import { CallScreen } from './call-screen';
import { IncomingCall } from './incoming-call';

export function CallOverlay() {
  const { call, accept, decline } = useCall();
  if (!call) {
    return null;
  }
  return call.phase === 'incoming' ? <IncomingCall call={call} onAccept={accept} onDecline={decline} /> : <CallScreen />;
}
