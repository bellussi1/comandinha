import { describe, expect, it } from 'vitest';
import { parseSeedConfig } from './seed-config.js';

const validEnvironment = {
  NODE_ENV: 'development',
  DEMO_OWNER_NAME: 'Comandinha Owner',
  DEMO_OWNER_EMAIL: 'OWNER@EXAMPLE.COM',
  DEMO_OWNER_PASSWORD: 'a-long-local-password',
  DEMO_RESTAURANT_NAME: 'Local Restaurant',
  DEMO_RESTAURANT_SLUG: 'local-restaurant',
};

describe('parseSeedConfig', () => {
  it('normalizes the owner email and returns the explicit local restaurant', () => {
    expect(parseSeedConfig(validEnvironment)).toEqual({
      ownerName: 'Comandinha Owner',
      ownerEmail: 'owner@example.com',
      ownerPassword: 'a-long-local-password',
      restaurantName: 'Local Restaurant',
      restaurantSlug: 'local-restaurant',
    });
  });

  it('refuses to seed production even when all variables are present', () => {
    expect(() =>
      parseSeedConfig({ ...validEnvironment, NODE_ENV: 'production' }),
    ).toThrow('Demo seed is disabled in production.');
  });

  it('requires every owner and restaurant value instead of using default credentials', () => {
    expect(() => parseSeedConfig({ NODE_ENV: 'development' })).toThrow(
      'DEMO_OWNER_NAME is required.',
    );
  });

  it('rejects a password shorter than twelve characters', () => {
    expect(() =>
      parseSeedConfig({
        ...validEnvironment,
        DEMO_OWNER_PASSWORD: 'short-pass',
      }),
    ).toThrow('DEMO_OWNER_PASSWORD must contain at least 12 characters.');
  });
});
