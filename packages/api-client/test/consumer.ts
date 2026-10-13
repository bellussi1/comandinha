import { createApiClient } from '@comandinha/api-client';

const api = createApiClient('http://localhost:3001');
void api.GET('/health/live');
// @ts-expect-error Only paths published in the generated OpenAPI contract are supported.
void api.GET('/route-that-does-not-exist');
