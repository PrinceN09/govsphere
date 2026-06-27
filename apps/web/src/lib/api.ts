/**
 * Prinodia Workspace API Client
 *
 * Axios instance pre-configured for the NestJS API.
 * - Attaches Authorization header from session.
 * - Intercepts 401 responses and triggers token refresh via NextAuth.
 * - All requests go through /api/proxy/* in development to avoid CORS.
 */

import axios from "axios";
import { getSession, signOut } from "next-auth/react";

import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";

const API_BASE_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";

/** Shape of all API error responses from the NestJS backend. */
export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

/** Paginated list response from the backend. */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Query params for paginated list endpoints. */
export interface ListQuery {
  search?: string;
  page?: number;
  limit?: number;
  isActive?: boolean;
}

// ─── Axios instance ───────────────────────────────────────────────────────────

let _accessToken: string | null = null;

/** Call this from SessionProvider to prime the token cache. */
export function setAccessToken(token: string | null): void {
  _accessToken = token;
}

export function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: API_BASE_URL,
    headers: { "Content-Type": "application/json" },
    withCredentials: true, // sends HttpOnly refresh cookie
    timeout: 15_000,
  });

  // ── Request interceptor — attach access token ──────────────────────────────
  client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const token = _accessToken ?? (await getSession())?.accessToken;
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  });

  // ── Response interceptor — handle 401 ─────────────────────────────────────
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<ApiError>) => {
      const status = error.response?.status;

      if (status === 401) {
        // Access token expired — sign out and redirect to login.
        // Token refresh is handled server-side in the NextAuth jwt callback;
        // a 401 here means the refresh also failed.
        await signOut({ callbackUrl: "/login" });
      }

      return Promise.reject(error);
    },
  );

  return client;
}

export const apiClient = createApiClient();

// ─── Typed API helpers ────────────────────────────────────────────────────────

export async function apiGet<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const { data } = await apiClient.get<T>(path, { params });
  return data;
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const { data } = await apiClient.post<T>(path, body);
  return data;
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const { data } = await apiClient.patch<T>(path, body);
  return data;
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const res = await apiClient.put(path, body);
  return res.data as T;
}

export async function apiDelete(path: string): Promise<void> {
  await apiClient.delete(path);
}
