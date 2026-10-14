import type { CreateAdminSessionRequest } from '@/src/lib/server/auth-api';
import { createAdminSession } from '@/src/lib/server/auth-api';
import { setAdminSessionCookie } from '@/src/lib/server/auth-cookie';
import { consumeLoginSourceAttempt } from '@/src/lib/server/login-source-rate-limit';
import {
  authErrorResponse,
  authNoStoreHeaders,
  authOriginRejectedResponse,
  isTrustedMutationOrigin,
} from '@/src/lib/server/auth-response';

const maxRequestBytes = 8 * 1024;
const restaurantSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type BoundedBodyResult =
  | { kind: 'ok'; text: string }
  | { kind: 'too-large' }
  | { kind: 'invalid' };

async function readBodyWithinLimit(request: Request): Promise<BoundedBodyResult> {
  if (!request.body) return { kind: 'ok', text: '' };

  const reader = request.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let bytesRead = 0;
  let text = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        text += decoder.decode();
        return { kind: 'ok', text };
      }

      bytesRead += value.byteLength;
      if (bytesRead > maxRequestBytes) {
        await reader.cancel().catch(() => undefined);
        return { kind: 'too-large' };
      }

      text += decoder.decode(value, { stream: true });
    }
  } catch {
    return { kind: 'invalid' };
  } finally {
    reader.releaseLock();
  }
}

function isLoginRequest(value: unknown): value is CreateAdminSessionRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const body = value as Record<string, unknown>;
  return (
    typeof body.email === 'string' &&
    body.email.trim().length > 0 &&
    body.email.length <= 254 &&
    body.email.includes('@') &&
    typeof body.password === 'string' &&
    body.password.length > 0 &&
    body.password.length <= 1_024 &&
    (body.restaurantSlug === undefined ||
      (typeof body.restaurantSlug === 'string' &&
        restaurantSlugPattern.test(body.restaurantSlug)))
  );
}

export async function POST(request: Request): Promise<Response> {
  if (!isTrustedMutationOrigin(request)) return authOriginRejectedResponse();

  const contentType = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
  if (contentType !== 'application/json') {
    return Response.json({ message: 'O corpo da requisição deve ser JSON.' }, {
      status: 415,
      headers: authNoStoreHeaders,
    });
  }

  const contentLength = request.headers.get('content-length');
  const declaredLength = contentLength && /^\d+$/.test(contentLength)
    ? Number(contentLength)
    : undefined;
  if (declaredLength !== undefined && declaredLength > maxRequestBytes) {
    return Response.json({ message: 'A requisição excede o tamanho permitido.' }, {
      status: 413,
      headers: authNoStoreHeaders,
    });
  }

  const boundedBody = await readBodyWithinLimit(request);
  if (boundedBody.kind === 'too-large') {
    return Response.json({ message: 'A requisição excede o tamanho permitido.' }, {
      status: 413,
      headers: authNoStoreHeaders,
    });
  }
  if (boundedBody.kind === 'invalid') {
    return Response.json({ message: 'Não foi possível ler os dados enviados.' }, {
      status: 400,
      headers: authNoStoreHeaders,
    });
  }

  let body: unknown;
  try {
    body = JSON.parse(boundedBody.text);
  } catch {
    return Response.json({ message: 'O corpo da requisição não contém JSON válido.' }, {
      status: 400,
      headers: authNoStoreHeaders,
    });
  }

  if (!isLoginRequest(body)) {
    return Response.json({ message: 'Confira os dados de acesso informados.' }, {
      status: 400,
      headers: authNoStoreHeaders,
    });
  }

  const sourceCheck = consumeLoginSourceAttempt(request);
  if (!sourceCheck.allowed) {
    const headers = new Headers(authNoStoreHeaders);
    if (sourceCheck.retryAfterSeconds) {
      headers.set('Retry-After', String(sourceCheck.retryAfterSeconds));
    }

    return Response.json(
      {
        message: sourceCheck.status === 429
          ? 'Muitas tentativas. Tente novamente em instantes.'
          : 'Não foi possível validar a sessão agora.',
      },
      { status: sourceCheck.status, headers },
    );
  }

  try {
    const session = await createAdminSession({
      email: body.email.trim(),
      password: body.password,
      ...(body.restaurantSlug ? { restaurantSlug: body.restaurantSlug } : {}),
    }, sourceCheck.clientKey);
    await setAdminSessionCookie(session.sessionToken, session.expiresAt);
    const safeSession = {
      user: session.user,
      restaurant: session.restaurant,
      membership: session.membership,
      expiresAt: session.expiresAt,
    };
    return Response.json(safeSession, { status: 200, headers: authNoStoreHeaders });
  } catch (error) {
    return authErrorResponse(error);
  }
}
