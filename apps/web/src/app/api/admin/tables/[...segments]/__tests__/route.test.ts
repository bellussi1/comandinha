/** @jest-environment node */

jest.mock("server-only", () => ({}));
jest.mock("@/src/lib/server/auth-cookie", () => ({
  readAdminSessionCookie: jest.fn(),
}));
jest.mock("@/src/lib/server/auth-response", () => ({
  isTrustedMutationOrigin: jest.fn(),
}));

import { readAdminSessionCookie } from "@/src/lib/server/auth-cookie";
import { isTrustedMutationOrigin } from "@/src/lib/server/auth-response";
import { GET, PATCH, POST } from "../route";
import { GET as GETCollection, POST as POSTCollection } from "../../route";

const tableId = "3c4e6ef9-7a30-4420-8c87-50f29c3df224";
const sessionToken = "s".repeat(43);
const origin = "http://localhost:3000";
const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
const originalFetch = global.fetch;

function request(
  path: string,
  options: {
    method?: string;
    body?: string;
    headers?: Record<string, string>;
  } = {},
) {
  const headers = new Headers(options.headers);
  if (options.body !== undefined && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  return new Request(`http://localhost:3000/api/admin/tables/${path}`, {
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

describe("same-origin table gateway", () => {
  it("serves the collection URL for listing and creating tables", async () => {
    fetchMock.mockResolvedValueOnce(Response.json([]));
    const list = await GETCollection(request(""));
    expect(list.status).toBe(200);

    fetchMock.mockResolvedValueOnce(
      Response.json({ id: tableId, name: "Mesa 04" }, { status: 201 }),
    );
    const create = await POSTCollection(
      request("", {
        method: "POST",
        body: JSON.stringify({ name: "Mesa 04" }),
        headers: { origin },
      }),
    );

    expect(create.status).toBe(201);
    expect(fetchMock.mock.calls.map(([target]) => target)).toEqual([
      new URL("http://127.0.0.1:3001/tables"),
      new URL("http://127.0.0.1:3001/tables"),
    ]);
  });

  it("requires the server-side admin session and trusted origin for mutations", async () => {
    jest.mocked(readAdminSessionCookie).mockResolvedValue(undefined);
    const unauthorized = await GET(request(""), context([]));
    expect(unauthorized.status).toBe(401);

    jest.mocked(readAdminSessionCookie).mockResolvedValue(sessionToken);
    jest.mocked(isTrustedMutationOrigin).mockReturnValue(false);
    const forbidden = await POST(
      request("", {
        method: "POST",
        body: JSON.stringify({ name: "Mesa 04" }),
      }),
      context([]),
    );

    expect(forbidden.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects malformed IDs, unsupported methods, queries and body fields", async () => {
    const malformedId = await GET(
      request("not-a-uuid"),
      context(["not-a-uuid"]),
    );
    const unknownQuery = await GET(
      request("?restaurantId=other-tenant"),
      context([]),
    );
    const unsupportedMethod = await POST(
      request(tableId, {
        method: "POST",
        body: JSON.stringify({ name: "Mesa" }),
      }),
      context([tableId]),
    );
    const forgedTenant = await POST(
      request("", {
        method: "POST",
        body: JSON.stringify({ name: "Mesa 04", restaurantId: tableId }),
        headers: { origin },
      }),
      context([]),
    );
    const forgedStatus = await POST(
      request("", {
        method: "POST",
        body: JSON.stringify({ name: "Mesa 04", isActive: false }),
        headers: { origin },
      }),
      context([]),
    );

    expect(malformedId.status).toBe(400);
    expect(unknownQuery.status).toBe(400);
    expect(unsupportedMethod.status).toBe(405);
    expect(forgedTenant.status).toBe(400);
    expect(forgedStatus.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("caps mutation bodies at 16 KiB and accepts only JSON", async () => {
    const oversized = await POST(
      request("", {
        method: "POST",
        body: JSON.stringify({ name: "x".repeat(17 * 1024) }),
        headers: { origin },
      }),
      context([]),
    );
    const unsupported = await PATCH(
      request(tableId, {
        method: "PATCH",
        body: "name=Mesa",
        headers: { origin, "content-type": "text/plain" },
      }),
      context([tableId]),
    );

    expect(oversized.status).toBe(413);
    expect(unsupported.status).toBe(415);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards the session and allowed request to Nest with a timeout and no-store", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ id: tableId, name: "Mesa 04" }, { status: 201 }),
    );
    const response = await POST(
      request("", {
        method: "POST",
        body: JSON.stringify({ name: "Mesa 04" }),
        headers: {
          origin,
          authorization: "Bearer browser-token",
          "x-restaurant-id": "forged-tenant",
        },
      }),
      context([]),
    );

    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const [target, init] = fetchMock.mock.calls[0];
    expect(target).toEqual(new URL("http://127.0.0.1:3001/tables"));
    expect(init).toMatchObject({
      method: "POST",
      body: JSON.stringify({ name: "Mesa 04" }),
      cache: "no-store",
      redirect: "error",
    });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    const headers = new Headers(init?.headers);
    expect([...headers.keys()].sort()).toEqual([
      "authorization",
      "content-type",
    ]);
    expect(headers.get("authorization")).toBe(`Bearer ${sessionToken}`);
    expect(headers.get("x-restaurant-id")).toBeNull();
  });

  it("returns a safe error instead of leaking upstream internals", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        { message: "secret database stack", stack: "private" },
        { status: 500 },
      ),
    );
    const response = await GET(request(""), context([]));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      message: "Não foi possível processar mesas agora.",
    });
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
