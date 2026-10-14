import 'server-only';
import type { ApiPaths } from '@comandinha/api-client';

export type CreateAdminSessionRequest = NonNullable<
  ApiPaths['/auth/sessions']['post']['requestBody']
>['content']['application/json'];
export type CreatedAdminSession = ApiPaths['/auth/sessions']['post']['responses'][201]['content']['application/json'];
export type AdminSessionMetadata = ApiPaths['/auth/sessions/current']['get']['responses'][200]['content']['application/json'];

type AuthApiErrorPayload = {
  code?: string;
  memberships?: unknown[];
};

export class AuthApiError extends Error {
  constructor(
    readonly status: number,
    readonly payload: unknown = null,
  ) {
    super(`Authentication API request failed with status ${status}.`);
    this.name = 'AuthApiError';
  }
}

const gatewaySecretHeader = 'x-comandinha-gateway-secret';
const requestTimeoutMs = 5_000;

function getGatewayConfiguration(): { apiOrigin: string; gatewaySecret: string } {
  const rawApiUrl = process.env.API_INTERNAL_URL?.trim();
  const gatewaySecret = process.env.AUTH_GATEWAY_SECRET;

  if (!rawApiUrl || !gatewaySecret || gatewaySecret.length < 32) {
    throw new AuthApiError(503);
  }

  try {
    const apiUrl = new URL(rawApiUrl);
    if (
      !['http:', 'https:'].includes(apiUrl.protocol) ||
      (process.env.NODE_ENV === 'production' && apiUrl.protocol !== 'https:') ||
      apiUrl.username ||
      apiUrl.password ||
      apiUrl.pathname !== '/' ||
      apiUrl.search ||
      apiUrl.hash
    ) {
      throw new Error('Invalid API origin.');
    }

    return { apiOrigin: apiUrl.origin, gatewaySecret };
  } catch {
    throw new AuthApiError(503);
  }
}

async function requestApi<T>(
  path: string,
  init: {
    method: 'GET' | 'POST' | 'DELETE';
    sessionToken?: string;
    clientKey?: string;
    body?: unknown;
  },
): Promise<T> {
  const { apiOrigin, gatewaySecret } = getGatewayConfiguration();
  const headers: Record<string, string> = {
    [gatewaySecretHeader]: gatewaySecret,
  };

  if (init.body !== undefined) headers['content-type'] = 'application/json';
  if (init.sessionToken) headers.authorization = `Bearer ${init.sessionToken}`;
  if (init.clientKey) headers['x-comandinha-client-key'] = init.clientKey;

  let response: Response;
  try {
    response = await fetch(new URL(path, `${apiOrigin}/`), {
      method: init.method,
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(requestTimeoutMs),
      ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
    });
  } catch {
    throw new AuthApiError(503);
  }

  if (!response.ok) {
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      // Keep non-JSON service errors generic at the browser boundary.
    }
    throw new AuthApiError(response.status, payload);
  }

  if (response.status === 204) return undefined as T;

  try {
    return (await response.json()) as T;
  } catch {
    throw new AuthApiError(502);
  }
}

export function createAdminSession(
  credentials: CreateAdminSessionRequest,
  clientKey?: string,
): Promise<CreatedAdminSession> {
  return requestApi('/auth/sessions', {
    method: 'POST',
    body: credentials,
    ...(clientKey ? { clientKey } : {}),
  });
}

export function getAdminSession(sessionToken: string): Promise<AdminSessionMetadata> {
  return requestApi('/auth/sessions/current', { method: 'GET', sessionToken });
}

export function revokeAdminSession(sessionToken: string): Promise<void> {
  return requestApi('/auth/sessions/current', { method: 'DELETE', sessionToken });
}

export function isRestaurantSelectionError(
  payload: unknown,
): payload is AuthApiErrorPayload & { code: 'RESTAURANT_SELECTION_REQUIRED'; memberships: unknown[] } {
  if (!payload || typeof payload !== 'object') return false;
  const error = payload as AuthApiErrorPayload;
  return error.code === 'RESTAURANT_SELECTION_REQUIRED' && Array.isArray(error.memberships);
}
