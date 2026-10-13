import { AuthApiError, getAdminSession, revokeAdminSession } from '@/src/lib/server/auth-api';
import { clearAdminSessionCookie, readAdminSessionCookie } from '@/src/lib/server/auth-cookie';
import {
  authErrorResponse,
  authNoStoreHeaders,
  authOriginRejectedResponse,
  authUnauthorizedResponse,
  isTrustedMutationOrigin,
} from '@/src/lib/server/auth-response';

export async function GET(): Promise<Response> {
  const sessionToken = await readAdminSessionCookie();
  if (!sessionToken) return authUnauthorizedResponse();

  try {
    const session = await getAdminSession(sessionToken);
    return Response.json(
      {
        user: session.user,
        restaurant: session.restaurant,
        membership: session.membership,
        expiresAt: session.expiresAt,
      },
      { headers: authNoStoreHeaders },
    );
  } catch (error) {
    if (error instanceof AuthApiError && error.status === 401) {
      await clearAdminSessionCookie();
      return authUnauthorizedResponse();
    }
    return authErrorResponse(error);
  }
}

export async function DELETE(request: Request): Promise<Response> {
  if (!isTrustedMutationOrigin(request)) return authOriginRejectedResponse();

  const sessionToken = await readAdminSessionCookie();
  if (!sessionToken) {
    await clearAdminSessionCookie();
    return new Response(null, { status: 204, headers: authNoStoreHeaders });
  }

  try {
    await revokeAdminSession(sessionToken);
  } catch (error) {
    if (!(error instanceof AuthApiError && error.status === 401)) {
      return authErrorResponse(error);
    }
  }

  await clearAdminSessionCookie();
  return new Response(null, { status: 204, headers: authNoStoreHeaders });
}
