import { describe, expect, it } from 'vitest';
import { parseSeedConfig } from './seed-config.js';

const validEnvironment = {
  NODE_ENV: 'development',
  ALLOW_LOCAL_DEMO_SEED: 'true',
  DATABASE_URL: 'postgresql://comandinha:local-only@127.0.0.1:5432/comandinha',
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
    expect(() => parseSeedConfig({
      NODE_ENV: 'development',
      ALLOW_LOCAL_DEMO_SEED: 'true',
      DATABASE_URL: validEnvironment.DATABASE_URL,
    })).toThrow(
      'DEMO_OWNER_NAME is required.',
    );
  });

  it('requires an explicit local seed opt-in', () => {
    expect(() =>
      parseSeedConfig({ ...validEnvironment, ALLOW_LOCAL_DEMO_SEED: 'false' }),
    ).toThrow('Set ALLOW_LOCAL_DEMO_SEED=true to run the local demo seed.');
  });

  it('refuses a remote database even outside production mode', () => {
    expect(() =>
      parseSeedConfig({
        ...validEnvironment,
        DATABASE_URL: 'postgresql://app:secret@db.example.com:5432/comandinha',
      }),
    ).toThrow('Demo seed can only target a loopback database URL.');
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
