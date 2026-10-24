'use client';

import { useState, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { CallOverlay } from '@/components/calls/call-overlay';
import { CallProvider } from '@/components/calls/call-provider';
import { makeStore } from '@/store';
import { AuthBootstrap } from './auth-bootstrap';
import { RealtimeProvider } from './realtime-provider';

export function StoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(makeStore);
  return (
    <Provider store={store}>
      <AuthBootstrap />
      <RealtimeProvider />
      <CallProvider>
        {children}
        <CallOverlay />
      </CallProvider>
    </Provider>
  );
}
