import 'server-only';
import { cookies } from 'next/headers';

const localCookieName = 'comandinha_admin_session';
const productionCookieName = '__Host-comandinha_admin_session';

function getCookieName(): string {
  return process.env.NODE_ENV === 'production' ? productionCookieName : localCookieName;
}

function cookieSecurityOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  };
}

export async function readAdminSessionCookie(): Promise<string | undefined> {
  const cookie = (await cookies()).get(getCookieName());
  return cookie?.value || undefined;
}

export async function setAdminSessionCookie(
  sessionToken: string,
  expiresAt: string,
): Promise<void> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(sessionToken)) {
    throw new Error('The authentication API returned an invalid session token.');
  }

  const expiry = new Date(expiresAt);
  const maxAge = Math.floor((expiry.getTime() - Date.now()) / 1_000);
  if (!Number.isFinite(expiry.getTime()) || maxAge < 1) {
    throw new Error('The authentication API returned an invalid session expiry.');
  }

  (await cookies()).set({
    name: getCookieName(),
    value: sessionToken,
    ...cookieSecurityOptions(),
    expires: expiry,
    maxAge,
  });
}

export async function clearAdminSessionCookie(): Promise<void> {
  (await cookies()).set({
    name: getCookieName(),
    value: '',
    ...cookieSecurityOptions(),
    expires: new Date(0),
    maxAge: 0,
  });
}
