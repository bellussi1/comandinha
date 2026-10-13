import type { ApiPaths } from "@comandinha/api-client";

export type CatalogCategory =
  ApiPaths["/catalog/categories"]["get"]["responses"][200]["content"]["application/json"][number];
export type CatalogProduct =
  ApiPaths["/catalog/products"]["get"]["responses"][200]["content"]["application/json"][number];
export type CreateCatalogCategory =
  ApiPaths["/catalog/categories"]["post"]["requestBody"]["content"]["application/json"];
export type UpdateCatalogCategory =
  ApiPaths["/catalog/categories/{id}"]["patch"]["requestBody"]["content"]["application/json"];
export type CreateCatalogProduct =
  ApiPaths["/catalog/products"]["post"]["requestBody"]["content"]["application/json"];
export type UpdateCatalogProduct =
  ApiPaths["/catalog/products/{id}"]["patch"]["requestBody"]["content"]["application/json"];

type ProductQuery = NonNullable<
  ApiPaths["/catalog/products"]["get"]["parameters"]["query"]
>;

export class CatalogRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "CatalogRequestError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/admin/catalog${path}`, {
      ...init,
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        ...(init?.body ? { "content-type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new CatalogRequestError(
      "Não foi possível conectar ao catálogo. Tente novamente.",
      0,
    );
  }

  if (response.status === 204) return undefined as T;

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = undefined;
  }

  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "message" in payload &&
      typeof payload.message === "string"
        ? payload.message
        : "Não foi possível concluir a operação. Tente novamente.";
    throw new CatalogRequestError(message, response.status);
  }

  return payload as T;
}

export function listCatalogCategories(): Promise<CatalogCategory[]> {
  return request<CatalogCategory[]>("/categories", { method: "GET" });
}

export function listCatalogProducts(
  query: ProductQuery = {},
): Promise<CatalogProduct[]> {
  const params = new URLSearchParams();
  if (query.categoryId) params.set("categoryId", query.categoryId);
  if (query.includeArchived !== undefined) {
    params.set("includeArchived", String(query.includeArchived));
  }
  const search = params.size ? `?${params.toString()}` : "";
  return request<CatalogProduct[]>(`/products${search}`, { method: "GET" });
}

export function createCatalogCategory(
  payload: CreateCatalogCategory,
): Promise<CatalogCategory> {
  return request<CatalogCategory>("/categories", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateCatalogCategory(
  id: string,
  payload: UpdateCatalogCategory,
): Promise<CatalogCategory> {
  return request<CatalogCategory>(`/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function removeCatalogCategory(id: string): Promise<void> {
  return request<void>(`/categories/${id}`, { method: "DELETE" });
}

export function createCatalogProduct(
  payload: CreateCatalogProduct,
): Promise<CatalogProduct> {
  return request<CatalogProduct>("/products", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateCatalogProduct(
  id: string,
  payload: UpdateCatalogProduct,
): Promise<CatalogProduct> {
  return request<CatalogProduct>(`/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function archiveCatalogProduct(id: string): Promise<void> {
  return request<void>(`/products/${id}`, { method: "DELETE" });
}
