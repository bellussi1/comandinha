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
import { GET, PATCH } from "../route";
import { GET as GETCollection } from "../../route";

const orderId = "c9aa4031-4fbe-48d5-a626-c23cd8d25a5d";
const sessionToken = "o".repeat(43);
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
  return new Request(`http://localhost:3000/api/admin/orders/${path}`, {
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

describe("same-origin order gateway", () => {
  it("serves the collection URL for the authenticated order queue", async () => {
    fetchMock.mockResolvedValue(Response.json([]));
    const response = await GETCollection(request(""));

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("http://127.0.0.1:3001/orders"),
      expect.objectContaining({ method: "GET", cache: "no-store" }),
    );
  });

  it("rejects missing sessions and untrusted mutation origins", async () => {
    jest.mocked(readAdminSessionCookie).mockResolvedValue(undefined);
    expect((await GET(request(""), context([]))).status).toBe(401);

    jest.mocked(readAdminSessionCookie).mockResolvedValue(sessionToken);
    jest.mocked(isTrustedMutationOrigin).mockReturnValue(false);
    const response = await PATCH(
      request(`${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "PREPARING" }),
      }),
      context([orderId, "status"]),
    );
    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("allows only known order routes, status filters and mutation fields", async () => {
    const invalidId = await GET(request("bad-id"), context(["bad-id"]));
    const invalidStatus = await GET(request("?status=UNKNOWN"), context([]));
    const unknownQuery = await GET(request("?tenantId=other"), context([]));
    const unknownBody = await PATCH(
      request(`${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "PREPARING", restaurantId: orderId }),
        headers: { origin },
      }),
      context([orderId, "status"]),
    );
    const wrongEndpointMethod = await PATCH(
      request(orderId, {
        method: "PATCH",
        body: JSON.stringify({ status: "READY" }),
        headers: { origin },
      }),
      context([orderId]),
    );

    expect(invalidId.status).toBe(400);
    expect(invalidStatus.status).toBe(400);
    expect(unknownQuery.status).toBe(400);
    expect(unknownBody.status).toBe(400);
    expect(wrongEndpointMethod.status).toBe(405);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("caps bodies at 16 KiB and forwards only allowed status values", async () => {
    const oversized = await PATCH(
      request(`${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "PREPARING",
          notes: "x".repeat(17 * 1024),
        }),
        headers: { origin },
      }),
      context([orderId, "status"]),
    );
    expect(oversized.status).toBe(413);

    fetchMock.mockResolvedValue(
      Response.json({ id: orderId, status: "PREPARING" }),
    );
    const response = await PATCH(
      request(`${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "PREPARING" }),
        headers: { origin },
      }),
      context([orderId, "status"]),
    );

    expect(response.status).toBe(200);
    const [target, init] = fetchMock.mock.calls[0];
    expect(target).toEqual(
      new URL(`http://127.0.0.1:3001/orders/${orderId}/status`),
    );
    expect(init).toMatchObject({
      method: "PATCH",
      body: JSON.stringify({ status: "PREPARING" }),
      redirect: "error",
    });
  });

  it("forwards an allowed filter and hides unsafe upstream details", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        { message: "internal stack and token", debug: "secret" },
        { status: 500 },
      ),
    );
    const response = await GET(request("?status=PENDING"), context([]));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      message: "Não foi possível processar pedidos agora.",
    });
    expect(
      new URL(fetchMock.mock.calls[0][0] as URL).searchParams.get("status"),
    ).toBe("PENDING");
  });
});
