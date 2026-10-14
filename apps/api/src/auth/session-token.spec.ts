import { describe, expect, it } from 'vitest';
import { createSessionToken, hashSessionToken } from './session-token.js';

describe('opaque session tokens', () => {
  it('generates a 256-bit URL-safe secret and stores a fixed-length one-way hash', () => {
    const token = createSessionToken();
    const hash = hashSessionToken(token);

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toBe(token);
  });

  it('creates a different secret and hash for every session', () => {
    const first = createSessionToken();
    const second = createSessionToken();

    expect(second).not.toBe(first);
    expect(hashSessionToken(second)).not.toBe(hashSessionToken(first));
  });
});
