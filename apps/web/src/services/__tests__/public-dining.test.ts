/** @jest-environment node */

import {
  submitPublicOrder,
  type PublicOrderPayload,
} from "../public-dining";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

describe("public dining requests", () => {
  it("localizes the conflict returned when a table has no open session", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      Response.json(
        { message: "This table is not accepting orders." },
        { status: 409 },
      ),
    );
    const payload = {
      requestId: "0f7b1db9-cba9-4d4b-a5ea-ae798e56b53a",
      items: [],
    } as PublicOrderPayload;

    await expect(submitPublicOrder("A".repeat(43), payload)).rejects.toMatchObject({
      status: 409,
      message: "Esta mesa não está recebendo pedidos no momento.",
    });
  });
});
