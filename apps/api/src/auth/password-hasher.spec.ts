import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password-hasher.js';

describe('password hashing', () => {
  it('creates a versioned scrypt hash and verifies the matching password', async () => {
    const encoded = await hashPassword('a-long-local-password');

    expect(encoded).toMatch(
      /^scrypt\$1\$16384\$8\$1\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/,
    );
    await expect(
      verifyPassword('a-long-local-password', encoded),
    ).resolves.toBe(true);
  });

  it('uses a fresh salt and rejects a different password', async () => {
    const firstHash = await hashPassword('a-long-local-password');
    const secondHash = await hashPassword('a-long-local-password');

    expect(secondHash).not.toBe(firstHash);
    await expect(
      verifyPassword('a-different-password', firstHash),
    ).resolves.toBe(false);
  });

  it('rejects malformed or unsupported encodings without deriving a key', async () => {
    await expect(
      verifyPassword('a-long-local-password', 'scrypt$999$1$1$1$bad$bad'),
    ).resolves.toBe(false);
    await expect(
      verifyPassword('a-long-local-password', 'plaintext'),
    ).resolves.toBe(false);
  });
});
