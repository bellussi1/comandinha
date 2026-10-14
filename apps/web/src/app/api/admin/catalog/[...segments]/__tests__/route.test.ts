/** @jest-environment node */

jest.mock("server-only", () => ({}));
jest.mock("@/src/lib/server/auth-cookie", () => ({
  readAdminSessionCookie: jest.fn(),
}));
jest.mock("@/src/lib/server/auth-response", () => ({
  isTrustedMutationOrigin: jest.fn(),
}));

import { isTrustedMutationOrigin } from "@/src/lib/server/auth-response";
import { readAdminSessionCookie } from "@/src/lib/server/auth-cookie";
import { DELETE, GET, PATCH, POST } from "../route";

const origin = "http://localhost:3000";
const sessionToken = "S".repeat(43);
const categoryId = "fa3103b4-39dd-4e5d-9204-d2b3da8a6f87";
const productId = "cb62d0d2-3b99-4e1d-9b13-b68d0f94a8e3";
const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
const originalFetch = global.fetch;

function makeRequest(
  path: string,
  options: {
    method?: string;
    body?: string;
    contentType?: string;
    headers?: Record<string, string>;
  } = {},
) {
  const headers = new Headers(options.headers);
  if (options.contentType) headers.set("content-type", options.contentType);
  else if (options.body !== undefined)
    headers.set("content-type", "application/json");

  return new Request(`http://localhost:3000/api/admin/catalog/${path}`, {
    method: options.method ?? "GET",
    headers,
    ...(options.body !== undefined ? { body: options.body } : {}),
  });
}

function context(segments: string[]) {
  return { params: Promise.resolve({ segments }) };
}

beforeEach(() => {
  process.env.API_INTERNAL_URL = "http://127.0.0.1:3001";
  process.env.APP_ORIGIN = origin;
  Reflect.set(process.env, "NODE_ENV", "test");
  jest.clearAllMocks();
  jest.mocked(readAdminSessionCookie).mockResolvedValue(sessionToken);
  jest.mocked(isTrustedMutationOrigin).mockReturnValue(true);
  global.fetch = fetchMock;
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe("same-origin catalog gateway", () => {
  it("rejects a missing session before contacting Nest", async () => {
    jest.mocked(readAdminSessionCookie).mockResolvedValue(undefined);

    const response = await GET(
      makeRequest("categories"),
      context(["categories"]),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects missing and untrusted origins for every mutation before fetch", async () => {
    jest.mocked(isTrustedMutationOrigin).mockReturnValue(false);
    const mutations = [
      POST(
        makeRequest("categories", {
          method: "POST",
          body: '{"name":"Bebidas"}',
        }),
        context(["categories"]),
      ),
      PATCH(
        makeRequest(`categories/${categoryId}`, {
          method: "PATCH",
          body: '{"name":"Bebidas"}',
        }),
        context(["categories", categoryId]),
      ),
      DELETE(
        makeRequest(`products/${productId}`, { method: "DELETE" }),
        context(["products", productId]),
      ),
    ];

    for (const mutation of mutations) {
      expect((await mutation).status).toBe(403);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects non-JSON and oversized request bodies before fetch", async () => {
    const unsupportedContentType = await POST(
      makeRequest("categories", {
        method: "POST",
        body: "name=Bebidas",
        contentType: "text/plain",
      }),
      context(["categories"]),
    );
    const oversized = await POST(
      makeRequest("categories", {
        method: "POST",
        body: JSON.stringify({ name: "x".repeat(65 * 1024) }),
      }),
      context(["categories"]),
    );

    expect(unsupportedContentType.status).toBe(415);
    expect(oversized.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects unknown paths, methods, query keys, and tenant body fields", async () => {
    const unknownPath = await GET(makeRequest("private"), context(["private"]));
    const malformedId = await GET(
      makeRequest("categories/not-a-uuid"),
      context(["categories", "not-a-uuid"]),
    );
    const unknownQuery = await GET(
      makeRequest(`products?tenantId=${categoryId}`),
      context(["products"]),
    );
    const forbiddenMethod = await PATCH(
      makeRequest("categories", {
        method: "PATCH",
        body: '{"name":"Não pode patch na coleção"}',
      }),
      context(["categories"]),
    );
    const forgedTenant = await POST(
      makeRequest("categories", {
        method: "POST",
        body: JSON.stringify({ name: "Bebidas", restaurantId: categoryId }),
      }),
      context(["categories"]),
    );

    expect(unknownPath.status).toBe(404);
    expect(malformedId.status).toBe(400);
    expect(unknownQuery.status).toBe(400);
    expect(forbiddenMethod.status).toBe(405);
    expect(forgedTenant.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards only the typed product query and server cookie session", async () => {
    fetchMock.mockResolvedValue(
      Response.json([{ id: productId, name: "Suco" }]),
    );

    const response = await GET(
      makeRequest(`products?categoryId=${categoryId}&includeArchived=true`, {
        headers: {
          authorization: "Bearer browser-forged-token",
          "x-restaurant-id": "browser-forged-tenant",
          "x-internal-secret": "browser-forged-secret",
        },
      }),
      context(["products"]),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: productId, name: "Suco" }]);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("set-cookie")).toBeNull();
    const [target, init] = fetchMock.mock.calls[0];
    expect(target).toEqual(
      new URL(
        `http://127.0.0.1:3001/catalog/products?categoryId=${categoryId}&includeArchived=true`,
      ),
    );
    expect(init).toMatchObject({ method: "GET", cache: "no-store" });
    const forwardedHeaders = new Headers(init?.headers);
    expect(forwardedHeaders.get("authorization")).toBe(
      `Bearer ${sessionToken}`,
    );
    expect([...forwardedHeaders.keys()]).toEqual(["authorization"]);
  });

  it("forwards only allowed category fields and preserves the safe API response", async () => {
    const category = { id: categoryId, name: "Bebidas", productCount: 0 };
    fetchMock.mockResolvedValue(Response.json(category, { status: 201 }));

    const response = await POST(
      makeRequest("categories", {
        method: "POST",
        body: JSON.stringify({ name: "Bebidas", displayOrder: 2 }),
        headers: {
          origin,
          authorization: "Bearer browser-forged-token",
          "x-forwarded-host": "attacker.example",
        },
      }),
      context(["categories"]),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual(category);
    const [target, init] = fetchMock.mock.calls[0];
    expect(target).toEqual(new URL("http://127.0.0.1:3001/catalog/categories"));
    expect(init).toMatchObject({
      method: "POST",
      body: JSON.stringify({ name: "Bebidas", displayOrder: 2 }),
    });
    const forwardedHeaders = new Headers(init?.headers);
    expect(forwardedHeaders.get("authorization")).toBe(
      `Bearer ${sessionToken}`,
    );
    expect(forwardedHeaders.get("content-type")).toBe("application/json");
    expect([...forwardedHeaders.keys()].sort()).toEqual([
      "authorization",
      "content-type",
    ]);
  });

  it("preserves API status while stripping cookies, headers, stack traces, and secrets", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        {
          statusCode: 500,
          message: "Erro interno controlado.",
          stack: "SECRET STACK",
          passwordHash: "SECRET HASH",
          debug: { token: sessionToken },
        },
        {
          status: 500,
          headers: {
            "set-cookie": "session=leak",
            "x-internal-secret": "do-not-forward",
          },
        },
      ),
    );

    const response = await GET(
      makeRequest("categories"),
      context(["categories"]),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      statusCode: 500,
      message: "Não foi possível processar a solicitação do catálogo.",
    });
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("x-internal-secret")).toBeNull();
  });

  it("does not expose a stack trace embedded in the upstream message", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        {
          statusCode: 500,
          message: [
            "Internal error at CatalogService.update (C:\\app\\src\\catalog.service.ts:42:9)",
          ],
        },
        { status: 500 },
      ),
    );

    const response = await GET(
      makeRequest("categories"),
      context(["categories"]),
    );

    await expect(response.json()).resolves.toEqual({
      statusCode: 500,
      message: "Não foi possível processar a solicitação do catálogo.",
    });
  });

  it("maps API network failures to a bounded gateway response", async () => {
    fetchMock.mockRejectedValue(
      new Error(`connection failed with ${sessionToken}`),
    );

    const response = await GET(
      makeRequest("categories"),
      context(["categories"]),
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      message: "Não foi possível carregar o catálogo agora.",
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
