import { ForbiddenException } from '@nestjs/common';
import { MembershipRole } from '../generated/prisma/client.js';

export function normalizeCategoryName(name: string): string {
  return name.normalize('NFKC').trim().toLowerCase();
}

export function assertCatalogWriteAccess(role: MembershipRole): void {
  if (role === MembershipRole.STAFF) {
    throw new ForbiddenException(
      'Only restaurant owners and administrators can change the catalog.',
    );
  }
}
