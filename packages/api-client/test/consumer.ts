import { createApiClient, type ApiPaths } from '@comandinha/api-client';

const api = createApiClient('http://localhost:3001');
void api.GET('/health/live');

const categoryWithoutDefaultFields: ApiPaths['/catalog/categories']['post']['requestBody']['content']['application/json'] = {
  name: 'Bebidas',
};
const productWithoutDefaultFields: ApiPaths['/catalog/products']['post']['requestBody']['content']['application/json'] = {
  name: 'Suco',
  categoryId: 'fa3103b4-39dd-4e5d-9204-d2b3da8a6f87',
  priceInCents: 100,
};
void categoryWithoutDefaultFields;
void productWithoutDefaultFields;

// @ts-expect-error Only paths published in the generated OpenAPI contract are supported.
void api.GET('/route-that-does-not-exist');
