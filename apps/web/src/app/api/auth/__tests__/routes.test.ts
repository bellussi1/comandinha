/** @jest-environment node */

jest.mock('server-only', () => ({}));
jest.mock('next/headers', () => ({ cookies: jest.fn() }));

import { createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import { POST as login } from '../login/route';
import { DELETE as logout, GET as currentSession } from '../session/route';

const origin = 'http://localhost:3000';
const gatewaySecret = 'test-gateway-secret-with-at-least-32-characters';
const sessionToken = 'A'.repeat(43);
const cookieName = 'comandinha_admin_session';
const safeSession = {
  user: { id: 'user-id', name: 'Enzo', email: 'enzo@example.com' },
  restaurant: { id: 'restaurant-id', name: 'Casa', slug: 'casa' },
  membership: { id: 'membership-id', role: 'OWNER' },
  expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
};
const createdSession = { ...safeSession, sessionToken };

const cookieValues = new Map<string, string>();
const cookieStore = {
  get: jest.fn((name: string) => {
    const value = cookieValues.get(name);
    return value ? { name, value } : undefined;
  }),
  set: jest.fn((options: { name: string; value: string; maxAge?: number }) => {
    if (options.maxAge === 0 || !options.value) cookieValues.delete(options.name);
    else cookieValues.set(options.name, options.value);
  }),
  delete: jest.fn(),
};
const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
const originalFetch = global.fetch;

function request(
  path: string,
  options: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
) {
  const headers = new Headers(options.headers);
  if (options.body !== undefined && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  return new Request(`http://localhost:3000${path}`, {
    method: options.method ?? 'GET',
    headers,
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });
}

beforeEach(() => {
  process.env.APP_ORIGIN = origin;
  process.env.API_INTERNAL_URL = 'http://127.0.0.1:3001';
  process.env.AUTH_GATEWAY_SECRET = gatewaySecret;
  delete process.env.VERCEL;
  delete process.env.TRUSTED_CLIENT_IP_HEADER;
  Reflect.set(process.env, 'NODE_ENV', 'test');
  cookieValues.clear();
  jest.clearAllMocks();
  (cookies as jest.Mock).mockResolvedValue(cookieStore);
  global.fetch = fetchMock;
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe('same-origin admin session gateway', () => {
  it('rejects login mutations with a missing or untrusted origin', async () => {
    const missingOrigin = await login(
      request('/api/auth/login', { method: 'POST', body: { email: 'a@b.com', password: 'x' } }),
    );
    const mismatchedOrigin = await login(
      request('/api/auth/login', {
        method: 'POST',
        body: { email: 'a@b.com', password: 'x' },
        headers: { origin: 'https://attacker.example' },
      }),
    );

    expect(missingOrigin.status).toBe(403);
    expect(mismatchedOrigin.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects non-JSON and oversized credentials before calling Nest', async () => {
    const unsupportedContentType = await login(
      request('/api/auth/login', {
        method: 'POST',
        body: { email: 'a@b.com', password: 'secret-password' },
        headers: { origin, 'content-type': 'text/plain' },
      }),
    );
    const oversized = await login(
      request('/api/auth/login', {
        method: 'POST',
        body: { email: 'a@b.com', password: 'x'.repeat(9_000) },
        headers: { origin },
      }),
    );

    expect(unsupportedContentType.status).toBe(415);
    expect(oversized.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('stops reading an oversized streaming body as soon as the byte limit is exceeded', async () => {
    let chunksPulled = 0;
    let wasCancelled = false;
    const body = new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          chunksPulled += 1;
          const chunkSize = [7_000, 2_000, 1_000_000][chunksPulled - 1] ?? 0;
          controller.enqueue(new Uint8Array(chunkSize));
          if (chunksPulled > 2) controller.close();
        },
        cancel() {
          wasCancelled = true;
        },
      },
      { highWaterMark: 0 },
    );
    const streamedRequest = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json' },
      body,
      duplex: 'half',
    } as RequestInit);

    const response = await login(streamedRequest);

    expect(response.status).toBe(413);
    expect(chunksPulled).toBe(2);
    expect(wasCancelled).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('stores the opaque secret in a secure HttpOnly cookie and returns only safe metadata', async () => {
    process.env.APP_ORIGIN = 'https://comandinha.example';
    process.env.API_INTERNAL_URL = 'https://api.internal.example';
    process.env.VERCEL = '1';
    Reflect.set(process.env, 'NODE_ENV', 'production');
    fetchMock.mockResolvedValue(Response.json(createdSession, { status: 201 }));

    const response = await login(
      request('/api/auth/login', {
        method: 'POST',
        body: { email: ' ENZO@example.com ', password: 'secret-password' },
        headers: {
          origin: 'https://comandinha.example',
          'x-forwarded-for': '198.51.100.79',
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(safeSession);
    expect(body).not.toHaveProperty('sessionToken');
    expect(cookieStore.set).toHaveBeenCalledWith(
      expect.objectContaining({
        name: '__Host-comandinha_admin_session',
        value: sessionToken,
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: expect.any(Number),
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://api.internal.example/auth/sessions'),
      expect.objectContaining({
        method: 'POST',
        cache: 'no-store',
        headers: expect.objectContaining({
          'content-type': 'application/json',
          'x-comandinha-gateway-secret': gatewaySecret,
          'x-comandinha-client-key': createHash('sha256')
            .update('ipv4:198.51.100.79')
            .digest('hex'),
        }),
      }),
    );
  });

  it('maps invalid credentials without setting a session cookie', async () => {
    process.env.VERCEL = '1';
    fetchMock.mockResolvedValue(
      Response.json({ message: 'Invalid email or password.' }, { status: 401 }),
    );

    const response = await login(
      request('/api/auth/login', {
        method: 'POST',
        body: { email: 'unknown@example.com', password: 'wrong-password' },
        headers: {
          origin,
          'x-forwarded-for': '198.51.100.81',
          'x-comandinha-client-key': 'forged-browser-value',
        },
      }),
    );

    expect(response.status).toBe(401);
    expect(cookieStore.set).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://127.0.0.1:3001/auth/sessions'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-comandinha-client-key': createHash('sha256')
            .update('ipv4:198.51.100.81')
            .digest('hex'),
        }),
      }),
    );
  });

  it('limits repeated login attempts from one trusted Vercel client across different accounts', async () => {
    process.env.VERCEL = '1';
    fetchMock.mockResolvedValue(
      Response.json({ message: 'Invalid email or password.' }, { status: 401 }),
    );

    const responses: Response[] = [];
    for (let attempt = 0; attempt < 21; attempt += 1) {
      responses.push(await login(
        request('/api/auth/login', {
          method: 'POST',
          body: { email: `account-${attempt}@example.com`, password: 'wrong-password' },
          headers: { origin, 'x-forwarded-for': '198.51.100.77' },
        }),
      ));
    }

    expect(responses.slice(0, 20).every((response) => response.status === 401)).toBe(true);
    expect(responses[20].status).toBe(429);
    expect(responses[20].headers.get('retry-after')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(20);

    const otherClient = await login(
      request('/api/auth/login', {
        method: 'POST',
        body: { email: 'other-client@example.com', password: 'wrong-password' },
        headers: { origin, 'x-forwarded-for': '198.51.100.78' },
      }),
    );

    expect(otherClient.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(21);
  });

  it('groups IPv6 addresses in the same /64 under one source limit', async () => {
    process.env.VERCEL = '1';
    fetchMock.mockResolvedValue(
      Response.json({ message: 'Invalid email or password.' }, { status: 401 }),
    );

    const responses: Response[] = [];
    for (let attempt = 0; attempt < 21; attempt += 1) {
      const address = attempt % 2 === 0
        ? '2001:db8:abcd:12::1'
        : '2001:0db8:abcd:0012:0000:0000:0000:0002';
      responses.push(await login(
        request('/api/auth/login', {
          method: 'POST',
          body: { email: `ipv6-account-${attempt}@example.com`, password: 'wrong-password' },
          headers: { origin, 'x-forwarded-for': address },
        }),
      ));
    }

    expect(responses.slice(0, 20).every((response) => response.status === 401)).toBe(true);
    expect(responses[20].status).toBe(429);
    expect(fetchMock).toHaveBeenCalledTimes(20);
  });

  it('fails closed when server-only gateway configuration is missing', async () => {
    process.env.AUTH_GATEWAY_SECRET = '';

    const response = await login(
      request('/api/auth/login', {
        method: 'POST',
        body: { email: 'enzo@example.com', password: 'secret-password' },
        headers: { origin },
      }),
    );

    expect(response.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requires HTTPS for the internal API origin in production', async () => {
    process.env.APP_ORIGIN = 'https://comandinha.example';
    process.env.API_INTERNAL_URL = 'http://api.internal.example';
    process.env.VERCEL = '1';
    Reflect.set(process.env, 'NODE_ENV', 'production');
    fetchMock.mockResolvedValue(Response.json(createdSession, { status: 201 }));

    const response = await login(
      request('/api/auth/login', {
        method: 'POST',
        body: { email: 'enzo@example.com', password: 'secret-password' },
        headers: {
          origin: 'https://comandinha.example',
          'x-forwarded-for': '198.51.100.80',
        },
      }),
    );

    expect(response.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fails closed in production when no trusted client identity is configured', async () => {
    Reflect.set(process.env, 'NODE_ENV', 'production');
    fetchMock.mockResolvedValue(
      Response.json({ message: 'Invalid email or password.' }, { status: 401 }),
    );

    const response = await login(
      request('/api/auth/login', {
        method: 'POST',
        body: { email: 'enzo@example.com', password: 'wrong-password' },
        headers: { origin, 'x-forwarded-for': '203.0.113.18' },
      }),
    );

    expect(response.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('preserves the safe restaurant-selection response', async () => {
    const selection = {
      code: 'RESTAURANT_SELECTION_REQUIRED',
      memberships: [{ membershipId: 'membership-id', role: 'OWNER', restaurant: safeSession.restaurant }],
    };
    fetchMock.mockResolvedValue(Response.json(selection, { status: 409 }));

    const response = await login(
      request('/api/auth/login', {
        method: 'POST',
        body: { email: 'enzo@example.com', password: 'secret-password' },
        headers: { origin },
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual(selection);
  });

  it('validates the session server-side and never returns its cookie value', async () => {
    cookieValues.set(cookieName, sessionToken);
    fetchMock.mockResolvedValue(Response.json(safeSession, { status: 200 }));

    const response = await currentSession();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(safeSession);
    expect(body).not.toHaveProperty('sessionToken');
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://127.0.0.1:3001/auth/sessions/current'),
      expect.objectContaining({
        method: 'GET',
        headers: {
          'x-comandinha-gateway-secret': gatewaySecret,
          authorization: `Bearer ${sessionToken}`,
        },
      }),
    );
  });

  it('returns 401 without contacting Nest when the browser has no session cookie', async () => {
    const response = await currentSession();

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('clears an invalid session cookie but retains it during an API outage', async () => {
    cookieValues.set(cookieName, sessionToken);
    fetchMock.mockResolvedValueOnce(Response.json({}, { status: 401 }));
    const invalidSession = await currentSession();
    expect(invalidSession.status).toBe(401);
    expect(cookieStore.set).toHaveBeenCalledWith(
      expect.objectContaining({ name: cookieName, value: '', maxAge: 0 }),
    );

    jest.clearAllMocks();
    cookieValues.set(cookieName, sessionToken);
    (cookies as jest.Mock).mockResolvedValue(cookieStore);
    fetchMock.mockResolvedValueOnce(Response.json({}, { status: 503 }));
    const unavailable = await currentSession();

    expect(unavailable.status).toBe(503);
    expect(cookieStore.set).not.toHaveBeenCalled();
    expect(cookieValues.get(cookieName)).toBe(sessionToken);
  });

  it('requires a trusted origin before revoking a session', async () => {
    cookieValues.set(cookieName, sessionToken);
    const response = await logout(
      request('/api/auth/session', {
        method: 'DELETE',
        headers: { origin: 'https://attacker.example' },
      }),
    );

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(cookieValues.get(cookieName)).toBe(sessionToken);
  });

  it('revokes the backend session and clears its cookie on logout', async () => {
    cookieValues.set(cookieName, sessionToken);
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    const response = await logout(
      request('/api/auth/session', { method: 'DELETE', headers: { origin } }),
    );

    expect(response.status).toBe(204);
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://127.0.0.1:3001/auth/sessions/current'),
      expect.objectContaining({
        method: 'DELETE',
        headers: {
          'x-comandinha-gateway-secret': gatewaySecret,
          authorization: `Bearer ${sessionToken}`,
        },
      }),
    );
    expect(cookieValues.has(cookieName)).toBe(false);
    expect(cookieStore.set).toHaveBeenCalledWith(
      expect.objectContaining({ name: cookieName, value: '', maxAge: 0 }),
    );
  });
});
