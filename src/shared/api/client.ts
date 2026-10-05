import { z } from 'zod';
import { env } from '../env';
import { AppError, toAppError } from '../types/error';

/**
 * Minimal typed fetch wrapper. Every call site supplies a Zod schema so the
 * response is validated at the API boundary before it ever reaches a hook
 * or component - the app never trusts raw JSON.
 */
export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  options: RequestOptions = {},
): Promise<T> {
  const url = `${env.VITE_API_BASE_URL}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? 'GET',
      headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch (cause) {
    throw new AppError('NETWORK', 'Unable to reach the server.', cause);
  }

  if (response.status === 409) {
    const payload = await response.json().catch(() => undefined);
    throw new AppError('CONFLICT', payload?.message ?? 'This order changed on the server.', payload);
  }
  if (response.status === 422) {
    const payload = await response.json().catch(() => undefined);
    throw new AppError('RULE_ERROR', payload?.message ?? 'That action is not allowed.', payload);
  }
  if (response.status === 404) {
    throw new AppError('NOT_FOUND', 'Resource not found.');
  }
  if (!response.ok) {
    throw new AppError('UNKNOWN', `Request failed with status ${response.status}.`);
  }

  const json = await response.json().catch(() => undefined);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new AppError('VALIDATION', 'Server returned data in an unexpected shape.', parsed.error.flatten());
  }
  return parsed.data;
}

export const api = {
  get: <T>(path: string, schema: z.ZodType<T>, signal?: AbortSignal) =>
    request(path, schema, { method: 'GET', signal }),
  post: <T>(path: string, schema: z.ZodType<T>, body?: unknown, signal?: AbortSignal) =>
    request(path, schema, { method: 'POST', body, signal }),
  patch: <T>(path: string, schema: z.ZodType<T>, body?: unknown, signal?: AbortSignal) =>
    request(path, schema, { method: 'PATCH', body, signal }),
};

export { toAppError };
