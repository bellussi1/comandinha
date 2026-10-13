import 'server-only';
import { createHash } from 'node:crypto';
import { isIP } from 'node:net';

const windowMs = 60_000;
const maxAttemptsPerWindow = 20;
const maxTrackedClients = 10_000;

type ClientBucket = { startedAt: number; attempts: number };
type LoginSourceCheck =
  | { allowed: true; clientKey?: string }
  | { allowed: false; status: 429 | 503; retryAfterSeconds?: number };

const buckets = new Map<string, ClientBucket>();
let lastPrunedAt = 0;

function trustedClientAddress(request: Request): string | null {
  const headerName = process.env.VERCEL === '1'
    ? 'x-forwarded-for'
    : process.env.TRUSTED_CLIENT_IP_HEADER?.trim().toLowerCase();

  if (!headerName || !/^[a-z0-9-]+$/.test(headerName)) return null;

  const address = request.headers.get(headerName)?.trim();
  if (!address || address.includes(',') || isIP(address) === 0) return null;

  return address;
}

function clientNetwork(address: string): string | null {
  if (isIP(address) === 4) return `ipv4:${address}`;
  if (isIP(address) !== 6) return null;

  try {
    const normalized = new URL(`http://[${address}]/`).hostname.slice(1, -1);
    const separator = normalized.indexOf('::');
    const groups = separator === -1
      ? normalized.split(':')
      : [
          ...normalized.slice(0, separator).split(':').filter(Boolean),
          ...Array(8 - normalized.split(':').filter(Boolean).length).fill('0'),
          ...normalized.slice(separator + 2).split(':').filter(Boolean),
        ];

    if (groups.length !== 8) return null;

    const paddedGroups = groups.map((group) =>
      Number.parseInt(group, 16).toString(16).padStart(4, '0'),
    );
    const isIpv4Mapped = paddedGroups.slice(0, 5).every((group) => group === '0000') &&
      paddedGroups[5] === 'ffff';

    if (isIpv4Mapped) {
      const bytes = paddedGroups.slice(6).flatMap((group) => [
        Number.parseInt(group.slice(0, 2), 16),
        Number.parseInt(group.slice(2), 16),
      ]);
      return `ipv4:${bytes.join('.')}`;
    }

    return `ipv6/64:${paddedGroups.slice(0, 4).join(':')}`;
  } catch {
    return null;
  }
}

function pruneExpiredBuckets(now: number): void {
  if (now - lastPrunedAt < windowMs) return;

  for (const [key, bucket] of buckets) {
    if (now - bucket.startedAt >= windowMs) buckets.delete(key);
  }

  lastPrunedAt = now;
}

/**
 * Vercel overwrites x-forwarded-for at its edge. Other production hosts must
 * configure a header that their trusted ingress overwrites before forwarding.
 */
export function consumeLoginSourceAttempt(request: Request, now = Date.now()): LoginSourceCheck {
  const address = trustedClientAddress(request);

  if (!address) {
    return process.env.NODE_ENV === 'production'
      ? { allowed: false, status: 503 }
      : { allowed: true };
  }

  const network = clientNetwork(address);
  if (!network) return { allowed: false, status: 503 };

  const key = createHash('sha256').update(network).digest('hex');
  pruneExpiredBuckets(now);

  const bucket = buckets.get(key);
  if (!bucket || now - bucket.startedAt >= windowMs) {
    if (buckets.size >= maxTrackedClients) {
      return { allowed: false, status: 503, retryAfterSeconds: 60 };
    }

    buckets.set(key, { startedAt: now, attempts: 1 });
    return { allowed: true, clientKey: key };
  }

  if (bucket.attempts >= maxAttemptsPerWindow) {
    return {
      allowed: false,
      status: 429,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.startedAt + windowMs - now) / 1_000)),
    };
  }

  bucket.attempts += 1;
  return { allowed: true, clientKey: key };
}
