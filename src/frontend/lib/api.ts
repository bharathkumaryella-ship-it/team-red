const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || '';

export type User = {
  id: number;
  email: string;
  full_name: string;
  role: 'PATIENT' | 'DOCTOR' | 'ADMIN';
};

type ApiError = { error?: string | { message?: string }; errors?: Record<string, string> };

async function authRequest<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${apiBaseUrl}/api/auth${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'include',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  const data = (await response.json().catch(() => ({}))) as T & ApiError;
  if (!response.ok) {
    const rawError = data.error;
    const details = data.errors ? Object.values(data.errors).join(' ')
      : typeof rawError === 'string' ? rawError : rawError?.message;
    throw new Error(details || (response.status === 429 ? 'Too many attempts. Try again later.' : 'Request failed.'));
  }
  return data;
}

export const authApi = {
  register: (input: { full_name: string; email: string; phone: string; password: string }) =>
    authRequest<User>('/register', input),
  login: (input: { email: string; password: string }) => authRequest<User>('/login', input),
  me: () => authRequest<User>('/me'),
  logout: () => authRequest<{ message: string }>('/logout', {}),
};

export async function apiRequest<T>(
  path: string,
  options: { method?: 'GET' | 'POST' | 'PUT' | 'PATCH'; body?: unknown } = {},
): Promise<T> {
  const method = options.method || 'GET';
  const response = await fetch(`${apiBaseUrl}/api${path}`, {
    method,
    credentials: 'include',
    headers: options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: 'no-store',
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = result?.error?.message || result?.error || 'Request failed.';
    throw new Error(typeof message === 'string' ? message : 'Request failed.');
  }
  return result as T;
}

export async function getHealthStatus() {
  const response = await fetch(`${apiBaseUrl}/api/health`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Unable to reach the backend health endpoint');
  }

  return response.json() as Promise<{ status: string; service: string }>;
}
