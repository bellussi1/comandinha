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
import { POST } from "../route";

const sessionId = "d4abcc94-e591-4d8d-980a-056ae9a4b8de";
const sessionToken = "s".repeat(43);
const origin = "http://localhost:3000";
const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
const originalFetch = global.fetch;

function request(id = sessionId) {
  return new Request(`http://localhost:3000/api/admin/sessions/${id}/close`, {
    method: "POST",
    headers: { origin },
  });
}

function context(id = sessionId) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  process.env.API_INTERNAL_URL = "http://127.0.0.1:3001";
  process.env.APP_ORIGIN = origin;
  Reflect.set(process.env, "NODE_ENV", "test");
  jest.clearAllMocks();
  fetchMock.mockReset();
  jest.mocked(readAdminSessionCookie).mockResolvedValue(sessionToken);
  jest.mocked(isTrustedMutationOrigin).mockReturnValue(true);
  global.fetch = fetchMock;
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe("same-origin session closure gateway", () => {
  it("returns the closed session contract", async () => {
    const session = {
      id: sessionId,
      tableId: "3c4e6ef9-7a30-4420-8c87-50f29c3df224",
      status: "CLOSED",
      closedTotalInCents: 4290,
    };
    fetchMock.mockResolvedValue(Response.json(session));

    const response = await POST(request(), context());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(session);
  });

  it("forwards close and preserves the safe 409 response", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        {
          message:
            "All orders must be delivered or cancelled before closing this table.",
          stack: "private upstream details",
        },
        { status: 409 },
      ),
    );

    const response = await POST(request(), context());

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      message: "Finalize ou cancele os pedidos antes de fechar a conta.",
    });
    const [target, init] = fetchMock.mock.calls[0];
    expect(target).toEqual(
      new URL(`http://127.0.0.1:3001/sessions/${sessionId}/close`),
    );
    expect(init).toMatchObject({ method: "POST" });
    expect(init).not.toHaveProperty("body");
    expect(new Headers(init?.headers).get("authorization")).toBe(
      `Bearer ${sessionToken}`,
    );
    expect(new Headers(init?.headers).has("x-comandinha-gateway-secret")).toBe(
      false,
    );
  });

  it("requires an admin session and a trusted mutation origin", async () => {
    jest.mocked(readAdminSessionCookie).mockResolvedValue(undefined);
    const unauthorized = await POST(request(), context());
    expect(unauthorized.status).toBe(401);

    jest.mocked(readAdminSessionCookie).mockResolvedValue(sessionToken);
    jest.mocked(isTrustedMutationOrigin).mockReturnValue(false);
    const forbidden = await POST(request(), context());
    expect(forbidden.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects malformed session IDs without contacting Nest", async () => {
    const response = await POST(request("invalid"), context("invalid"));
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
