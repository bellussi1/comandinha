/** @jest-environment node */

jest.mock("server-only", () => ({}));

import { GET } from "../route";

const code = "A".repeat(43);
const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
const originalFetch = global.fetch;

function request(tableCode = code) {
  return new Request(
    `http://localhost:3000/api/public/tables/${tableCode}/menu`,
    {
      headers: {
        authorization: "Bearer browser-token",
        cookie: "comandinha_admin_session=browser-cookie",
        "x-comandinha-gateway-secret": "browser-secret",
      },
    },
  );
}

function context(tableCode = code) {
  return { params: Promise.resolve({ code: tableCode }) };
}

beforeEach(() => {
  process.env.API_INTERNAL_URL = "http://127.0.0.1:3001";
  Reflect.set(process.env, "NODE_ENV", "test");
  jest.clearAllMocks();
  global.fetch = fetchMock;
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe("public table menu gateway", () => {
  it("loads a public menu without forwarding browser credentials", async () => {
    const menu = {
      restaurant: { name: "Casa" },
      table: { name: "Mesa 01" },
      categories: [],
    };
    fetchMock.mockResolvedValue(Response.json(menu));

    const response = await GET(request(), context());

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual(menu);
    const [target, init] = fetchMock.mock.calls[0];
    expect(target).toEqual(
      new URL(`http://127.0.0.1:3001/public/tables/${code}/menu`),
    );
    expect(init).toMatchObject({
      method: "GET",
      cache: "no-store",
      redirect: "error",
    });
    expect([...new Headers(init?.headers).keys()]).toEqual([]);
  });

  it("rejects malformed codes before calling the API", async () => {
    const response = await GET(request("bad-code"), context("bad-code"));

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps upstream network and unsafe error responses to generic messages", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        { message: "database password and stack", stack: "private" },
        { status: 500 },
      ),
    );
    const response = await GET(request(), context());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      message: "Não foi possível carregar o cardápio agora.",
    });
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
