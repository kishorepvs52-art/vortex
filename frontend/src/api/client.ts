// ═══════════════════════════════════════════════════════════════
// API client — relative URLs only (dev proxy / same-origin prod),
// Bearer auth from the auth store, transparent single-flight token
// refresh on 401, consistent typed errors.
// ═══════════════════════════════════════════════════════════════
import { API_BASE } from '../lib/constants';
import type { ApiEnvelope } from '../types/api';

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: { field: string; message: string }[],
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

interface TokenSource {
  getAccessToken(): string | null;
  getRefreshToken(): string | null;
  setTokens(accessToken: string, refreshToken: string): void;
  onRefreshFailed(): void;
}

let tokenSource: TokenSource | null = null;
export function bindTokenSource(ts: TokenSource) {
  tokenSource = ts;
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (!tokenSource) return false;
  const rt = tokenSource.getRefreshToken();
  if (!rt) return false;
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: rt }),
          credentials: 'include',
        });
        if (!res.ok) return false;
        const env = (await res.json()) as ApiEnvelope<{ accessToken: string; refreshToken: string }>;
        tokenSource!.setTokens(env.data.accessToken, env.data.refreshToken);
        return true;
      } catch {
        return false;
      } finally {
        setTimeout(() => (refreshPromise = null), 0);
      }
    })();
  }
  return refreshPromise;
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** skip one automatic refresh-retry cycle */
  noRetry?: boolean;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { body, noRetry, headers, ...rest } = opts;
  const token = tokenSource?.getAccessToken() ?? null;

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      ...(body !== undefined && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers as Record<string, string> | undefined),
    },
    body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  // Transparent refresh-and-retry on expired access token
  if (res.status === 401 && !noRetry && !path.startsWith('/auth/')) {
    const refreshed = await tryRefresh();
    if (refreshed) return request<T>(path, { ...opts, noRetry: true });
    tokenSource?.onRefreshFailed();
  }

  let payload: ApiEnvelope<T> | null = null;
  try {
    payload = (await res.json()) as ApiEnvelope<T>;
  } catch {
    /* non-JSON response */
  }

  if (!res.ok || !payload?.success) {
    const err = payload?.error;
    throw new ApiClientError(
      res.status,
      err?.code ?? 'NETWORK_ERROR',
      err?.message ?? `Request failed (${res.status})`,
      err?.details,
    );
  }

  // Attach pagination meta for list endpoints
  const data = payload.data;
  if (payload.meta && data && typeof data === 'object') {
    (data as Record<string, unknown>).__meta = payload.meta;
  }
  return data;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

/** Multipart upload with real progress events (XHR — fetch lacks upload progress). */
export function uploadWithProgress<T>(
  path: string,
  formData: FormData,
  onProgress: (pct: number) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}${path}`);
    xhr.withCredentials = true;
    const token = tokenSource?.getAccessToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onerror = () => reject(new ApiClientError(0, 'NETWORK_ERROR', 'Network error during upload'));
    xhr.onabort = () => reject(new ApiClientError(0, 'ABORTED', 'Upload cancelled'));
    xhr.onload = () => {
      let payload: ApiEnvelope<T> | null = null;
      try {
        payload = JSON.parse(xhr.responseText) as ApiEnvelope<T>;
      } catch {
        /* ignore */
      }
      if (xhr.status >= 200 && xhr.status < 300 && payload?.success) {
        resolve(payload.data);
      } else {
        reject(
          new ApiClientError(
            xhr.status,
            payload?.error?.code ?? 'UPLOAD_FAILED',
            payload?.error?.message ?? `Upload failed (${xhr.status})`,
            payload?.error?.details,
          ),
        );
      }
    };
    xhr.send(formData);
  });
}

/** Authenticated CSV download (reports). */
export async function downloadFile(path: string, filename: string) {
  const token = tokenSource?.getAccessToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });
  if (!res.ok) throw new ApiClientError(res.status, 'DOWNLOAD_FAILED', `Download failed (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
