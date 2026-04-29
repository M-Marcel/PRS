import type { ApiResponse } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function setOnUnauthorized(cb: () => void): void {
  onUnauthorized = cb;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface BackendResponse<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly requestId?: string;
  readonly timestamp?: string;
  readonly path?: string;
}

async function fetchApi<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch {
    return { success: false, error: 'Network error — backend may be unavailable' };
  }

  if (response.status === 401) {
    onUnauthorized?.();
    return { success: false, error: 'Session expired — please sign in again' };
  }

  let body: BackendResponse<T>;
  try {
    body = (await response.json()) as BackendResponse<T>;
  } catch {
    if (!response.ok) {
      throw new ApiError(
        `Request failed with status ${response.status}`,
        response.status,
      );
    }
    return { success: true, data: undefined as unknown as T };
  }

  if (!response.ok) {
    const message = body.error ?? `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, body.requestId);
  }

  return { success: true, data: body.data };
}

export async function apiGet<T>(path: string): Promise<ApiResponse<T>> {
  return fetchApi<T>(path, { method: 'GET' });
}

export async function apiPost<T>(
  path: string,
  body?: unknown,
): Promise<ApiResponse<T>> {
  return fetchApi<T>(path, {
    method: 'POST',
    body: body != null ? JSON.stringify(body) : undefined,
  });
}
