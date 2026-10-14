import { createParamDecorator } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { MembershipRole } from '../generated/prisma/client.js';

export interface AdminPrincipal {
  userId: string;
  name: string;
  email: string;
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  membershipId: string;
  role: MembershipRole;
  sessionId: string;
  expiresAt: Date;
}

export interface RequestWithAdminPrincipal extends Request {
  adminPrincipal?: AdminPrincipal;
}

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AdminPrincipal | undefined => {
    const request = context.switchToHttp().getRequest<RequestWithAdminPrincipal>();
    return request.adminPrincipal;
  },
);
