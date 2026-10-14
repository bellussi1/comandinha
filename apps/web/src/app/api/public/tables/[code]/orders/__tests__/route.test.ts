/** @jest-environment node */

jest.mock("server-only", () => ({}));
jest.mock("@/src/lib/server/auth-response", () => ({
  isTrustedMutationOrigin: jest.fn(),
}));
jest.mock("@/src/lib/server/public-order-rate-limit", () => ({
  consumePublicOrderAttempt: jest.fn(),
}));

import { isTrustedMutationOrigin } from "@/src/lib/server/auth-response";
import { consumePublicOrderAttempt } from "@/src/lib/server/public-order-rate-limit";
import { GET, POST } from "../route";
import { GET as getTrackedOrder } from "../[orderId]/route";

const code = "B".repeat(43);
const gatewaySecret = "local-test-gateway-secret-with-at-least-32-characters";
const origin = "http://localhost:3000";
const clientKey = "a".repeat(64);
const requestId = "8d6ac078-e3f7-49b2-a5ef-3cb0710fa08e";
const orderId = "ad97f868-d026-4ca8-a765-dd34acdb643f";
const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
const originalFetch = global.fetch;

function request(
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
  return new Request(`http://localhost:3000/api/public/tables/${code}/orders`, {
    method: options.method ?? "GET",
    headers,
    ...(options.body !== undefined ? { body: options.body } : {}),
  });
}

function context(tableCode = code) {
  return { params: Promise.resolve({ code: tableCode }) };
}

function trackedOrderRequest(id = orderId) {
  return new Request(
    `http://localhost:3000/api/public/tables/${code}/orders/${id}`,
  );
}

function trackedOrderContext(tableCode = code, id = orderId) {
  return { params: Promise.resolve({ code: tableCode, orderId: id }) };
}

beforeEach(() => {
  process.env.API_INTERNAL_URL = "http://127.0.0.1:3001";
  process.env.AUTH_GATEWAY_SECRET = gatewaySecret;
  process.env.APP_ORIGIN = origin;
  Reflect.set(process.env, "NODE_ENV", "test");
  jest.clearAllMocks();
  jest.mocked(isTrustedMutationOrigin).mockReturnValue(true);
  jest
    .mocked(consumePublicOrderAttempt)
    .mockReturnValue({ allowed: true, clientKey });
  global.fetch = fetchMock;
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe("public table orders gateway", () => {
  it("lists summaries without an admin session or service credentials", async () => {
    fetchMock.mockResolvedValue(Response.json([]));
    const response = await GET(request(), context());

    expect(response.status).toBe(200);
    const [target, init] = fetchMock.mock.calls[0];
    expect(target).toEqual(
      new URL(`http://127.0.0.1:3001/public/tables/${code}/orders`),
    );
    expect(init?.method).toBe("GET");
    expect([...new Headers(init?.headers).keys()]).toEqual([]);
  });

  it("fetches a specific public order by ID without exposing gateway credentials", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ id: orderId, status: "PREPARING", items: [] }),
    );
    const response = await getTrackedOrder(
      trackedOrderRequest(),
      trackedOrderContext(),
    );

    expect(response.status).toBe(200);
    const [target, init] = fetchMock.mock.calls[0];
    expect(target).toEqual(
      new URL(
        `http://127.0.0.1:3001/public/tables/${code}/orders/${orderId}`,
      ),
    );
    expect(init?.method).toBe("GET");
    expect([...new Headers(init?.headers).keys()]).toEqual([]);
  });

  it("requires a trusted origin and rejects malformed codes, bodies and oversized requests", async () => {
    jest.mocked(isTrustedMutationOrigin).mockReturnValue(false);
    const untrusted = await POST(
      request({
        method: "POST",
        body: JSON.stringify({ items: [{ productId: "x", quantity: 1 }] }),
      }),
      context(),
    );
    const badCode = await POST(
      request({
        method: "POST",
        body: JSON.stringify({ items: [{ productId: "x", quantity: 1 }] }),
        headers: { origin },
      }),
      context("bad-code"),
    );

    jest.mocked(isTrustedMutationOrigin).mockReturnValue(true);
    const missingRequestId = await POST(
      request({
        method: "POST",
        body: JSON.stringify({
          items: [
            { productId: "a8bb4d2e-f126-4b11-b85c-6116b6a39701", quantity: 1 },
          ],
        }),
        headers: { origin },
      }),
      context(),
    );
    const unknownField = await POST(
      request({
        method: "POST",
        body: JSON.stringify({
          requestId,
          items: [
            { productId: "a8bb4d2e-f126-4b11-b85c-6116b6a39701", quantity: 1 },
          ],
          totalInCents: 1,
        }),
        headers: { origin },
      }),
      context(),
    );
    const oversized = await POST(
      request({
        method: "POST",
        body: JSON.stringify({
          requestId,
          items: [
            { productId: "a8bb4d2e-f126-4b11-b85c-6116b6a39701", quantity: 1 },
          ],
          notes: "x".repeat(17 * 1024),
        }),
        headers: { origin },
      }),
      context(),
    );

    expect(untrusted.status).toBe(403);
    expect(badCode.status).toBe(400);
    expect(missingRequestId.status).toBe(400);
    expect(unknownField.status).toBe(400);
    expect(oversized.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("limits public submissions and includes Retry-After when the source is blocked", async () => {
    jest.mocked(consumePublicOrderAttempt).mockReturnValue({
      allowed: false,
      status: 429,
      retryAfterSeconds: 24,
    });
    const response = await POST(
      request({
        method: "POST",
        body: JSON.stringify({
          requestId,
          items: [
            { productId: "a8bb4d2e-f126-4b11-b85c-6116b6a39701", quantity: 1 },
          ],
        }),
        headers: { origin },
      }),
      context(),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("24");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards only server credentials and the rate-limit key for order creation", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ id: "order-id", status: "PENDING" }, { status: 201 }),
    );
    const body = {
      requestId,
      items: [
        { productId: "a8bb4d2e-f126-4b11-b85c-6116b6a39701", quantity: 2 },
      ],
    };
    const response = await POST(
      request({
        method: "POST",
        body: JSON.stringify(body),
        headers: {
          origin,
          authorization: "Bearer browser-token",
          cookie: "comandinha_admin_session=browser-token",
          "x-comandinha-client-key": "f".repeat(64),
          "x-comandinha-gateway-secret": "browser-secret",
        },
      }),
      context(),
    );

    expect(response.status).toBe(201);
    expect(jest.mocked(consumePublicOrderAttempt)).toHaveBeenCalledTimes(1);
    const [target, init] = fetchMock.mock.calls[0];
    expect(target).toEqual(
      new URL(`http://127.0.0.1:3001/public/tables/${code}/orders`),
    );
    expect(init).toMatchObject({
      method: "POST",
      body: JSON.stringify(body),
      cache: "no-store",
      redirect: "error",
    });
    const headers = new Headers(init?.headers);
    expect([...headers.keys()].sort()).toEqual([
      "content-type",
      "x-comandinha-client-key",
      "x-comandinha-gateway-secret",
    ]);
    expect(headers.get("x-comandinha-gateway-secret")).toBe(gatewaySecret);
    expect(headers.get("x-comandinha-client-key")).toBe(clientKey);
    expect(headers.get("authorization")).toBeNull();
    expect(headers.get("cookie")).toBeNull();
  });
});
