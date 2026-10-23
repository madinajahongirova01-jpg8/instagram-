import axios from 'axios';
import { API_BASE_URL } from './config';

export const http = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 30_000,
  headers: { Accept: 'application/json' },
});
