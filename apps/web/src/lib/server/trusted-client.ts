import { createHash } from "node:crypto";
import { isIP } from "node:net";

export type TrustedClientIdentity =
  { kind: "missing" } | { kind: "invalid" } | { kind: "trusted"; key: string };

function trustedClientAddress(request: Request): string | null {
  const headerName =
    process.env.VERCEL === "1"
      ? "x-forwarded-for"
      : process.env.TRUSTED_CLIENT_IP_HEADER?.trim().toLowerCase();

  if (!headerName || !/^[a-z0-9-]+$/.test(headerName)) return null;

  const address = request.headers.get(headerName)?.trim();
  if (!address || address.includes(",") || isIP(address) === 0) return null;

  return address;
}

function clientNetwork(address: string): string | null {
  if (isIP(address) === 4) return `ipv4:${address}`;
  if (isIP(address) !== 6) return null;

  try {
    const normalized = new URL(`http://[${address}]/`).hostname.slice(1, -1);
    const separator = normalized.indexOf("::");
    const groups =
      separator === -1
        ? normalized.split(":")
        : [
            ...normalized.slice(0, separator).split(":").filter(Boolean),
            ...Array(8 - normalized.split(":").filter(Boolean).length).fill(
              "0",
            ),
            ...normalized
              .slice(separator + 2)
              .split(":")
              .filter(Boolean),
          ];

    if (groups.length !== 8) return null;

    const paddedGroups = groups.map((group) =>
      Number.parseInt(group, 16).toString(16).padStart(4, "0"),
    );
    const isIpv4Mapped =
      paddedGroups.slice(0, 5).every((group) => group === "0000") &&
      paddedGroups[5] === "ffff";

    if (isIpv4Mapped) {
      const bytes = paddedGroups
        .slice(6)
        .flatMap((group) => [
          Number.parseInt(group.slice(0, 2), 16),
          Number.parseInt(group.slice(2), 16),
        ]);
      return `ipv4:${bytes.join(".")}`;
    }

    return `ipv6/64:${paddedGroups.slice(0, 4).join(":")}`;
  } catch {
    return null;
  }
}

export function getTrustedClientIdentity(
  request: Request,
): TrustedClientIdentity {
  const address = trustedClientAddress(request);
  if (!address) return { kind: "missing" };

  const network = clientNetwork(address);
  if (!network) return { kind: "invalid" };

  return {
    kind: "trusted",
    key: createHash("sha256").update(network).digest("hex"),
  };
}
