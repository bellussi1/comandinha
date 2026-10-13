import 'server-only';
import { AuthApiError, isRestaurantSelectionError } from './auth-api';

const noStoreHeaders = { 'Cache-Control': 'no-store' };

export function authErrorResponse(error: unknown): Response {
  if (error instanceof AuthApiError) {
    if (error.status === 401) {
      return Response.json({ message: 'E-mail ou senha inválidos.' }, {
        status: 401,
        headers: noStoreHeaders,
      });
    }

    if (error.status === 409 && isRestaurantSelectionError(error.payload)) {
      return Response.json(
        {
          code: error.payload.code,
          memberships: error.payload.memberships,
        },
        { status: 409, headers: noStoreHeaders },
      );
    }

    if (error.status === 429) {
      return Response.json({ message: 'Muitas tentativas. Tente novamente em instantes.' }, {
        status: 429,
        headers: noStoreHeaders,
      });
    }

    if (error.status === 400 || error.status === 422) {
      return Response.json({ message: 'Confira os dados informados.' }, {
        status: 400,
        headers: noStoreHeaders,
      });
    }
  }

  const status = error instanceof AuthApiError && error.status === 503 ? 503 : 502;
  return Response.json({ message: 'Não foi possível validar a sessão agora.' }, {
    status,
    headers: noStoreHeaders,
  });
}

export function authUnauthorizedResponse(): Response {
  return Response.json({ message: 'Sessão administrativa ausente ou inválida.' }, {
    status: 401,
    headers: noStoreHeaders,
  });
}

export function authOriginRejectedResponse(): Response {
  return Response.json({ message: 'Origem não autorizada.' }, {
    status: 403,
    headers: noStoreHeaders,
  });
}

export function isTrustedMutationOrigin(request: Request): boolean {
  const configuredOrigin = process.env.APP_ORIGIN?.trim();
  const requestOrigin = request.headers.get('origin');
  if (!configuredOrigin || !requestOrigin) return false;

  try {
    const url = new URL(configuredOrigin);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash ||
      url.origin !== configuredOrigin.replace(/\/$/, '')
    ) {
      return false;
    }

    return requestOrigin === url.origin;
  } catch {
    return false;
  }
}

export const authNoStoreHeaders = noStoreHeaders;
