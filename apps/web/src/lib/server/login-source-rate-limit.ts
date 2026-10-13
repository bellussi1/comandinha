import "server-only";
import { getTrustedClientIdentity } from "./trusted-client";

const windowMs = 60_000;
const maxAttemptsPerWindow = 20;
const maxTrackedClients = 10_000;

type ClientBucket = { startedAt: number; attempts: number };
type LoginSourceCheck =
  | { allowed: true; clientKey?: string }
  | { allowed: false; status: 429 | 503; retryAfterSeconds?: number };

const buckets = new Map<string, ClientBucket>();
let lastPrunedAt = 0;

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
export function consumeLoginSourceAttempt(
  request: Request,
  now = Date.now(),
): LoginSourceCheck {
  const identity = getTrustedClientIdentity(request);

  if (identity.kind === "missing") {
    return process.env.NODE_ENV === "production"
      ? { allowed: false, status: 503 }
      : { allowed: true };
  }

  if (identity.kind === "invalid") return { allowed: false, status: 503 };

  const key = identity.key;
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
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((bucket.startedAt + windowMs - now) / 1_000),
      ),
    };
  }

  bucket.attempts += 1;
  return { allowed: true, clientKey: key };
}
