import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { assertCanManageTables } from './tables-access.js';

describe('assertCanManageTables', () => {
  it.each(['OWNER', 'ADMIN'] as const)('allows %s to manage tables', (role) => {
    expect(() => assertCanManageTables(role)).not.toThrow();
  });

  it('rejects staff table mutations', () => {
    expect(() => assertCanManageTables('STAFF')).toThrow(ForbiddenException);
  });
});
