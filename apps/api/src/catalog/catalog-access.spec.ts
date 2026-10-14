import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { MembershipRole } from '../generated/prisma/client.js';
import {
  assertCatalogWriteAccess,
  normalizeCategoryName,
} from './catalog-access.js';

describe('catalog access and category normalization', () => {
  it('normalizes compatibility characters, whitespace, and case', () => {
    expect(normalizeCategoryName('  ＣＡＦＥ\u0301  ')).toBe('café');
  });

  it.each([MembershipRole.OWNER, MembershipRole.ADMIN])(
    'allows %s to write catalog records',
    (role) => {
      expect(() => assertCatalogWriteAccess(role)).not.toThrow();
    },
  );

  it('rejects staff writes with a forbidden response', () => {
    expect(() => assertCatalogWriteAccess(MembershipRole.STAFF)).toThrow(
      ForbiddenException,
    );
  });
});
