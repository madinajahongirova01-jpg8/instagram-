import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import { isAxiosError, type AxiosRequestConfig, type Method } from 'axios';
import type { ApiError } from '@insta/shared';
import { http } from '@/lib/http';
import { refreshSession } from '@/lib/refresh-session';
import { signedOut, tokenReceived, type AuthState } from './auth-slice';

export interface ApiRequest {
  url: string;
  method?: Method;
  data?: unknown;
  params?: Record<string, unknown>;
  headers?: AxiosRequestConfig['headers'];
}

export interface ApiQueryError {
  status: number;
  messages: string[];
}

function toQueryError(error: unknown): ApiQueryError {
  if (isAxiosError<ApiError>(error)) {
    if (!error.response) {
      return { status: 0, messages: [] };
    }
    const raw = error.response.data?.message;
    const messages = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : [];
    return { status: error.response.status, messages };
  }
  return { status: 0, messages: [] };
}

export const axiosBaseQuery: BaseQueryFn<ApiRequest, unknown, ApiQueryError> = async (request, api) => {
  const send = (token: string | null) =>
    http.request({
      url: request.url,
      method: request.method ?? 'GET',
      data: request.data,
      params: request.params,
      headers: { ...request.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });

  const { accessToken } = (api.getState() as { auth: AuthState }).auth;

  try {
    const response = await send(accessToken);
    return { data: response.data };
  } catch (error) {
    const expired = isAxiosError(error) && error.response?.status === 401 && accessToken !== null;
    if (!expired) {
      return { error: toQueryError(error) };
    }
  }

  const refreshed = await refreshSession();
  if (!refreshed) {
    api.dispatch(signedOut());
    return { error: { status: 401, messages: [] } };
  }
  api.dispatch(tokenReceived(refreshed.accessToken));
  try {
    const response = await send(refreshed.accessToken);
    return { data: response.data };
  } catch (error) {
    return { error: toQueryError(error) };
  }
};
