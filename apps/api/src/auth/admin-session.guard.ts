import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../database/prisma.service.js';
import { hashSessionToken } from './session-token.js';
import type { AdminPrincipal, RequestWithAdminPrincipal } from './admin-principal.js';

@Injectable()
export class AdminSessionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAdminPrincipal>();
    const token = this.readBearerToken(request);
    const now = new Date();
    const session = await this.prisma.adminSession.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      include: {
        membership: {
          include: {
            user: { select: { id: true, name: true, email: true, isActive: true } },
            restaurant: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= now ||
      !session.membership.isActive ||
      !session.membership.user.isActive
    ) {
      throw new UnauthorizedException();
    }

    const touch = await this.prisma.adminSession.updateMany({
      where: { id: session.id, revokedAt: null, expiresAt: { gt: now } },
      data: { lastSeenAt: now },
    });
    if (touch.count !== 1) {
      throw new UnauthorizedException();
    }

    const membership = session.membership;
    const principal: AdminPrincipal = {
      userId: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
      restaurantId: membership.restaurant.id,
      restaurantName: membership.restaurant.name,
      restaurantSlug: membership.restaurant.slug,
      membershipId: membership.id,
      role: membership.role,
      sessionId: session.id,
      expiresAt: session.expiresAt,
    };

    request.adminPrincipal = principal;
    return true;
  }

  private readBearerToken(request: Request): string {
    const authorization = request.headers.authorization;
    if (!authorization) {
      throw new UnauthorizedException();
    }

    const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(authorization);
    if (!match) {
      throw new UnauthorizedException();
    }

    return match[1];
  }
}
