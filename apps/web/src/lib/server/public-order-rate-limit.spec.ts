/** @jest-environment node */

import { createHash } from "node:crypto";
import { consumePublicOrderAttempt } from "./public-order-rate-limit";

function request(address?: string): Request {
  return new Request("http://localhost:3000/api/public/tables/code/orders", {
    method: "POST",
    headers: address ? { "x-real-ip": address } : undefined,
  });
}

beforeEach(() => {
  jest.resetModules();
  Reflect.set(process.env, "NODE_ENV", "test");
  delete process.env.VERCEL;
  process.env.TRUSTED_CLIENT_IP_HEADER = "x-real-ip";
});

describe("consumePublicOrderAttempt", () => {
  it("limits each trusted client to ten requests in a rolling minute and hashes its key", () => {
    const timestamp = 1_800_000_000_000;
    const expectedKey = createHash("sha256")
      .update("ipv4:203.0.113.8")
      .digest("hex");

    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect(
        consumePublicOrderAttempt(request("203.0.113.8"), timestamp + attempt),
      ).toEqual({
        allowed: true,
        clientKey: expectedKey,
      });
    }

    expect(
      consumePublicOrderAttempt(request("203.0.113.8"), timestamp + 10),
    ).toMatchObject({
      allowed: false,
      status: 429,
      retryAfterSeconds: 60,
    });
    expect(
      consumePublicOrderAttempt(request("203.0.113.9"), timestamp + 10).allowed,
    ).toBe(true);
  });

  it("resets the bucket after one minute and groups IPv6 clients by /64", () => {
    const timestamp = 1_800_000_100_000;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      consumePublicOrderAttempt(
        request("2001:db8:abcd:12::1"),
        timestamp + attempt,
      );
    }

    expect(
      consumePublicOrderAttempt(
        request("2001:db8:abcd:12::ffff"),
        timestamp + 10,
      ),
    ).toMatchObject({ allowed: false, status: 429 });
    expect(
      consumePublicOrderAttempt(
        request("2001:db8:abcd:12::ffff"),
        timestamp + 60_000,
      ),
    ).toMatchObject({ allowed: true });
  });

  it("fails closed in production when a trusted client address is unavailable", () => {
    Reflect.set(process.env, "NODE_ENV", "production");

    expect(consumePublicOrderAttempt(request(), 1_800_000_200_000)).toEqual({
      allowed: false,
      status: 503,
    });
  });

  it("uses only the Vercel edge header and rejects ambiguous forwarded chains", () => {
    Reflect.set(process.env, "NODE_ENV", "production");
    process.env.VERCEL = "1";
    delete process.env.TRUSTED_CLIENT_IP_HEADER;

    expect(
      consumePublicOrderAttempt(
        new Request("https://example.test/api/public/tables/code/orders", {
          method: "POST",
          headers: { "x-forwarded-for": "203.0.113.8, 10.0.0.1" },
        }),
        1_800_000_300_000,
      ),
    ).toEqual({ allowed: false, status: 503 });
  });
});
