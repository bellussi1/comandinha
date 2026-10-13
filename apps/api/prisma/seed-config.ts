export interface SeedConfig {
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
  restaurantName: string;
  restaurantSlug: string;
}

function requiredValue(environment: NodeJS.ProcessEnv, key: string): string {
  const value = environment[key]?.trim();
  if (!value) {
    throw new Error(`${key} is required.`);
  }

  return value;
}

export function parseSeedConfig(environment: NodeJS.ProcessEnv): SeedConfig {
  if (environment.NODE_ENV === 'production') {
    throw new Error('Demo seed is disabled in production.');
  }

  const ownerName = requiredValue(environment, 'DEMO_OWNER_NAME');
  const ownerEmail = requiredValue(
    environment,
    'DEMO_OWNER_EMAIL',
  ).toLowerCase();
  const ownerPassword = environment.DEMO_OWNER_PASSWORD;
  const restaurantName = requiredValue(environment, 'DEMO_RESTAURANT_NAME');
  const restaurantSlug = requiredValue(
    environment,
    'DEMO_RESTAURANT_SLUG',
  ).toLowerCase();

  if (!ownerPassword || ownerPassword.length < 12) {
    throw new Error('DEMO_OWNER_PASSWORD must contain at least 12 characters.');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
    throw new Error('DEMO_OWNER_EMAIL must be a valid email address.');
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(restaurantSlug)) {
    throw new Error(
      'DEMO_RESTAURANT_SLUG must contain lowercase letters, numbers, and hyphens.',
    );
  }

  return {
    ownerName,
    ownerEmail,
    ownerPassword,
    restaurantName,
    restaurantSlug,
  };
}
