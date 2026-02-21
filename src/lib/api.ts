export interface ApiUser {
  id: string;
  email: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  is_admin: boolean;
  created_at: string;
}

export interface Candle {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock_quantity: number;
  scent: string | null;
  size: string | null;
  burn_time: number | null;
  image_url: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

const TOKEN_KEY = 'candle_haven_token';

export const authToken = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = authToken.get();
  const headers = new Headers(init.headers ?? {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(path, {
    ...init,
    headers,
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : 'Request failed';
    throw new Error(message);
  }

  return payload as T;
}

export const apiGet = <T>(path: string) => apiRequest<T>(path);

export const apiPost = <T>(path: string, body?: unknown) =>
  apiRequest<T>(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });

export const apiPut = <T>(path: string, body?: unknown) =>
  apiRequest<T>(path, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });

export const apiDelete = <T>(path: string) =>
  apiRequest<T>(path, {
    method: 'DELETE',
  });
