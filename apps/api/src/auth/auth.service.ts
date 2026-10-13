import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { CreateSessionRequestDto } from './auth.dto.js';
import type { AdminPrincipal } from './admin-principal.js';
import { PrismaService } from '../database/prisma.service.js';
import { hashPassword, verifyPassword } from './password-hasher.js';
import { createSessionToken, hashSessionToken } from './session-token.js';

const invalidCredentialsMessage = 'Invalid email or password.';
const sessionLifetimeMs = 12 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly dummyPasswordHash = hashPassword(randomBytes(32).toString('base64url'));

  constructor(private readonly prisma: PrismaService) {}

  async createSession(credentials: CreateSessionRequestDto) {
    const normalizedEmail = credentials.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        memberships: {
          where: { isActive: true },
          include: { restaurant: true },
        },
      },
    });

    const passwordHash = user?.passwordHash ?? (await this.dummyPasswordHash);
    const usesLegacyPasswordHash = passwordHash.startsWith('scrypt$1$');
    const passwordIsValid = usesLegacyPasswordHash
      ? (
          await Promise.all([
            verifyPassword(credentials.password, passwordHash),
            this.dummyPasswordHash.then((dummyHash) =>
              verifyPassword(credentials.password, dummyHash),
            ),
          ])
        )[0]
      : await verifyPassword(credentials.password, passwordHash);

    if (!user || !user.isActive || !passwordIsValid || user.memberships.length === 0) {
      throw new UnauthorizedException(invalidCredentialsMessage);
    }

    if (usesLegacyPasswordHash) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await hashPassword(credentials.password) },
      });
    }

    const membership = this.selectMembership(user.memberships, credentials.restaurantSlug);
    const sessionToken = createSessionToken();
    const expiresAt = new Date(Date.now() + sessionLifetimeMs);

    await this.prisma.adminSession.create({
      data: {
        tokenHash: hashSessionToken(sessionToken),
        membershipId: membership.id,
        expiresAt,
      },
    });

    return {
      sessionToken,
      expiresAt: expiresAt.toISOString(),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      restaurant: {
        id: membership.restaurant.id,
        name: membership.restaurant.name,
        slug: membership.restaurant.slug,
      },
      membership: {
        id: membership.id,
        role: membership.role,
      },
    };
  }

  toSessionMetadata(principal: AdminPrincipal) {
    return {
      user: {
        id: principal.userId,
        name: principal.name,
        email: principal.email,
      },
      restaurant: {
        id: principal.restaurantId,
        name: principal.restaurantName,
        slug: principal.restaurantSlug,
      },
      membership: {
        id: principal.membershipId,
        role: principal.role,
      },
      expiresAt: principal.expiresAt.toISOString(),
    };
  }

  async revokeSession(principal: AdminPrincipal): Promise<void> {
    await this.prisma.adminSession.updateMany({
      where: { id: principal.sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private selectMembership<T extends {
    id: string;
    role: string;
    restaurant: { id: string; name: string; slug: string };
  }>(memberships: T[], restaurantSlug?: string): T {
    if (restaurantSlug) {
      const selected = memberships.find(({ restaurant }) => restaurant.slug === restaurantSlug);
      if (!selected) {
        throw new UnauthorizedException(invalidCredentialsMessage);
      }
      return selected;
    }

    if (memberships.length > 1) {
      throw new ConflictException({
        code: 'RESTAURANT_SELECTION_REQUIRED',
        memberships: memberships.map((membership) => ({
          membershipId: membership.id,
          role: membership.role,
          restaurant: {
            id: membership.restaurant.id,
            name: membership.restaurant.name,
            slug: membership.restaurant.slug,
          },
        })),
      });
    }

    return memberships[0];
  }
}
