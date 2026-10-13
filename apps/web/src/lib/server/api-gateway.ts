import "server-only";

export const apiRequestTimeoutMs = 5_000;
export const apiRequestBodyLimitBytes = 16 * 1024;

export type BoundedBodyResult =
  { kind: "ok"; text: string } | { kind: "too-large" } | { kind: "invalid" };

export type UpstreamResult =
  | { kind: "network-error" }
  | { kind: "invalid-json"; response: Response }
  | { kind: "response"; response: Response; body: unknown }
  | { kind: "no-content"; response: Response };

export function gatewayJsonResponse(
  body: unknown,
  status: number,
  extraHeaders?: HeadersInit,
): Response {
  const headers = new Headers(extraHeaders);
  headers.set("Cache-Control", "no-store");
  return Response.json(body, { status, headers });
}

export function gatewayError(
  status: number,
  message: string,
  retryAfterSeconds?: number,
): Response {
  const headers = new Headers();
  if (retryAfterSeconds !== undefined) {
    headers.set("Retry-After", String(retryAfterSeconds));
  }
  return gatewayJsonResponse({ message }, status, headers);
}

export function getInternalApiOrigin(): string | undefined {
  const rawApiUrl = process.env.API_INTERNAL_URL?.trim();
  if (!rawApiUrl) return undefined;

  try {
    const url = new URL(rawApiUrl);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      (process.env.NODE_ENV === "production" && url.protocol !== "https:") ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return undefined;
    }
    return url.origin;
  } catch {
    return undefined;
  }
}

export async function readBoundedBody(
  request: Request,
): Promise<BoundedBodyResult> {
  if (!request.body) return { kind: "ok", text: "" };

  const contentLength = request.headers.get("content-length");
  if (
    contentLength &&
    /^\d+$/.test(contentLength) &&
    Number(contentLength) > apiRequestBodyLimitBytes
  ) {
    await request.body.cancel().catch(() => undefined);
    return { kind: "too-large" };
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytesRead = 0;
  let text = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        text += decoder.decode();
        return { kind: "ok", text };
      }

      bytesRead += value.byteLength;
      if (bytesRead > apiRequestBodyLimitBytes) {
        await reader.cancel().catch(() => undefined);
        return { kind: "too-large" };
      }
      text += decoder.decode(value, { stream: true });
    }
  } catch {
    return { kind: "invalid" };
  } finally {
    reader.releaseLock();
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function hasAllowedFields(
  value: unknown,
  allowedFields: readonly string[],
  requiredFields: readonly string[] = [],
): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  const fields = Object.keys(value);
  return (
    fields.length > 0 &&
    requiredFields.every((field) => field in value) &&
    fields.every((field) => allowedFields.includes(field))
  );
}

export async function readUpstreamResponse(
  response: Response,
): Promise<UpstreamResult> {
  if (response.status === 204) return { kind: "no-content", response };
  try {
    return { kind: "response", response, body: await response.json() };
  } catch {
    return { kind: "invalid-json", response };
  }
}

export async function fetchApi(
  target: URL,
  init: Omit<RequestInit, "cache" | "redirect" | "signal">,
): Promise<UpstreamResult> {
  try {
    const response = await fetch(target, {
      ...init,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(apiRequestTimeoutMs),
    });
    return await readUpstreamResponse(response);
  } catch {
    return { kind: "network-error" };
  }
}

export function safeUpstreamError(
  value: unknown,
  allowedMessages: ReadonlySet<string>,
  fallback: string,
): { message: string } {
  const rawMessage = isRecord(value) ? value.message : undefined;
  const messages = Array.isArray(rawMessage)
    ? rawMessage.filter(
        (message): message is string => typeof message === "string",
      )
    : typeof rawMessage === "string"
      ? [rawMessage]
      : [];
  return {
    message:
      messages.find((message) => allowedMessages.has(message)) ?? fallback,
  };
}
