import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../database/prisma.service.js';

vi.mock('./password-hasher.js', () => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
}));

import { AuthService } from './auth.service.js';
import type { CreateSessionRequestDto } from './auth.dto.js';
import { hashPassword, verifyPassword } from './password-hasher.js';

const legacyPasswordHash = 'scrypt$1$16384$8$1$legacy-salt$legacy-key';

describe('AuthService legacy password timing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs current-cost dummy work concurrently with a legacy verification', async () => {
    let finishLegacyVerification!: (valid: boolean) => void;
    const legacyVerification = new Promise<boolean>((resolve) => {
      finishLegacyVerification = resolve;
    });
    vi.mocked(hashPassword)
      .mockResolvedValueOnce('scrypt$2$dummy-current')
      .mockResolvedValueOnce('scrypt$2$unused-candidate');
    vi.mocked(verifyPassword).mockImplementation((_password, encodedHash) =>
      encodedHash === legacyPasswordHash
        ? legacyVerification
        : Promise.resolve(true),
    );

    const user = {
      id: 'user-id',
      name: 'Legacy User',
      email: 'legacy@example.com',
      passwordHash: legacyPasswordHash,
      isActive: true,
      memberships: [],
    };
    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue(user) },
      adminSession: { create: vi.fn() },
    } as unknown as PrismaService;
    const service = new AuthService(prisma);
    const pendingLogin = service.createSession({
      email: user.email,
      password: 'incorrect-password',
    } as CreateSessionRequestDto);

    await new Promise((resolve) => setTimeout(resolve, 0));
    const verificationCountBeforeLegacyCompletes = vi.mocked(verifyPassword).mock.calls.length;
    finishLegacyVerification(false);
    await expect(pendingLogin).rejects.toThrow('Invalid email or password.');

    expect(verificationCountBeforeLegacyCompletes).toBe(2);
    expect(verifyPassword).toHaveBeenCalledWith('incorrect-password', 'scrypt$2$dummy-current');
  });
});
