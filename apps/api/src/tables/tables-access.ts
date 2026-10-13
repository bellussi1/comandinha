import { ForbiddenException } from '@nestjs/common';
import { MembershipRole } from '../generated/prisma/client.js';

export function assertCanManageTables(role: MembershipRole): void {
  if (role === MembershipRole.STAFF) {
    throw new ForbiddenException(
      'Only restaurant owners and administrators can manage tables.',
    );
  }
}
