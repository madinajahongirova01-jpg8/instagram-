'use client';

import { useEffect } from 'react';
import { refreshSession } from '@/lib/refresh-session';
import { api } from '@/store/api';
import { signedOut, tokenReceived } from '@/store/auth-slice';
import { useAppDispatch, useAppSelector } from '@/store';

export function AuthBootstrap() {
  const dispatch = useAppDispatch();
  const status = useAppSelector((state) => state.auth.status);

  useEffect(() => {
    if (status !== 'unknown') {
      return;
    }
    let active = true;
    void refreshSession().then((session) => {
      if (!active) {
        return;
      }
      if (session) {
        dispatch(tokenReceived(session.accessToken));
        dispatch(api.util.upsertQueryData('me', undefined, session.user));
      } else {
        dispatch(signedOut());
      }
    });
    return () => {
      active = false;
    };
  }, [dispatch, status]);

  return null;
}
