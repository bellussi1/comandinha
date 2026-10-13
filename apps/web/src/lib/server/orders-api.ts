import "server-only";
import type { ApiPaths } from "@comandinha/api-client";
import { isTrustedMutationOrigin } from "./auth-response";
import { readAdminSessionCookie } from "./auth-cookie";
import {
  fetchApi,
  gatewayError,
  gatewayJsonResponse,
  getInternalApiOrigin,
  hasAllowedFields,
  isRecord,
  readBoundedBody,
  safeUpstreamError,
} from "./api-gateway";
import { consumePublicOrderAttempt } from "./public-order-rate-limit";

type OrderResponse =
  ApiPaths["/orders"]["get"]["responses"][200]["content"]["application/json"][number];
type OrderSummary =
  ApiPaths["/orders/summary"]["get"]["responses"][200]["content"]["application/json"];
type OrderBody =
  ApiPaths["/orders/{id}/status"]["patch"]["requestBody"]["content"]["application/json"];
type OrderStatus =
  ApiPaths["/orders/{id}/status"]["patch"]["requestBody"]["content"]["application/json"]["status"];
type PublicMenu =
  ApiPaths["/public/tables/{code}/menu"]["get"]["responses"][200]["content"]["application/json"];
type PublicOrder =
  ApiPaths["/public/tables/{code}/orders"]["post"]["responses"][201]["content"]["application/json"];
type PublicOrderSummary =
  ApiPaths["/public/tables/{code}/orders"]["get"]["responses"][200]["content"]["application/json"];
type PublicOrderBody =
  ApiPaths["/public/tables/{code}/orders"]["post"]["requestBody"]["content"]["application/json"];

type AdminOrderOperation = {
  apiPath: string;
  method: "GET" | "PATCH";
  allowedMethods: readonly ("GET" | "PATCH")[];
  query?: "status";
  bodyFields?: readonly string[];
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const publicCodePattern = /^[A-Za-z0-9_-]{43}$/;
const orderStatuses = [
  "PENDING",
  "PREPARING",
  "READY",
  "DELIVERED",
  "CANCELLED",
] as const satisfies readonly OrderStatus[];
const safeOrderMessages = new Set([
  "Order not found.",
  "This order status transition is not allowed.",
  "The order status changed before this update.",
]);
const safePublicOrderMessages = new Set([
  "Table not found.",
  "One or more products are invalid.",
  "One or more products are unavailable.",
  "Duplicate products are not allowed.",
  "An order must contain 1 to 50 items.",
  "Order item details are invalid.",
  "An order item total is too large.",
  "The order total is too large.",
]);
const orderGatewaySecretHeader = "x-comandinha-gateway-secret";
const orderClientKeyHeader = "x-comandinha-client-key";

function resolveAdminOrderOperation(
  segments: string[],
): AdminOrderOperation | undefined {
  if (segments.length === 0) {
    return {
      apiPath: "/orders",
      method: "GET",
      allowedMethods: ["GET"],
      query: "status",
    };
  }
  if (segments.length === 1 && segments[0] === "summary") {
    return {
      apiPath: "/orders/summary",
      method: "GET",
      allowedMethods: ["GET"],
    };
  }
  if (segments.length === 1 && uuidPattern.test(segments[0])) {
    return {
      apiPath: `/orders/${segments[0]}`,
      method: "GET",
      allowedMethods: ["GET"],
    };
  }
  if (
    segments.length === 2 &&
    uuidPattern.test(segments[0]) &&
    segments[1] === "status"
  ) {
    return {
      apiPath: `/orders/${segments[0]}/status`,
      method: "PATCH",
      allowedMethods: ["PATCH"],
      bodyFields: ["status"],
    };
  }
  return undefined;
}

function isMalformedOrderIdPath(segments: string[]): boolean {
  return (
    (segments.length === 1 &&
      segments[0] !== "summary" &&
      !uuidPattern.test(segments[0])) ||
    (segments.length === 2 &&
      (!uuidPattern.test(segments[0]) || segments[1] !== "status"))
  );
}

function parseOrderStatus(value: unknown): value is OrderStatus {
  return (
    typeof value === "string" && orderStatuses.includes(value as OrderStatus)
  );
}

function parseAdminOrderQuery(
  request: Request,
  operation: AdminOrderOperation,
): string | undefined | null {
  const entries = [...new URL(request.url).searchParams.entries()];
  if (entries.length === 0) return undefined;
  if (
    operation.query !== "status" ||
    entries.length !== 1 ||
    entries[0][0] !== "status"
  ) {
    return null;
  }
  return parseOrderStatus(entries[0][1]) ? entries[0][1] : null;
}

async function forwardAdminOrderRequest(
  request: Request,
  operation: AdminOrderOperation,
): Promise<Response> {
  const method =
    request.method.toUpperCase() as AdminOrderOperation["allowedMethods"][number];
  if (!operation.allowedMethods.includes(method)) {
    return gatewayError(405, "Método não permitido para esta rota.");
  }

  const status = parseAdminOrderQuery(request, operation);
  if (status === null)
    return gatewayError(400, "Os filtros informados não são permitidos.");

  const isMutation = method === "PATCH";
  if (isMutation && !isTrustedMutationOrigin(request)) {
    return gatewayError(403, "Origem não autorizada.");
  }

  const sessionToken = await readAdminSessionCookie();
  if (!sessionToken || !/^[A-Za-z0-9_-]{43}$/.test(sessionToken)) {
    return gatewayError(401, "Sessão administrativa ausente ou inválida.");
  }

  let body: OrderBody | undefined;
  if (isMutation) {
    const contentType = request.headers
      .get("content-type")
      ?.split(";", 1)[0]
      .trim()
      .toLowerCase();
    if (contentType !== "application/json") {
      return gatewayError(415, "O corpo da requisição deve ser JSON.");
    }
    const bounded = await readBoundedBody(request);
    if (bounded.kind === "too-large")
      return gatewayError(413, "A requisição excede o tamanho permitido.");
    if (bounded.kind === "invalid")
      return gatewayError(400, "Não foi possível ler os dados enviados.");

    let parsed: unknown;
    try {
      parsed = JSON.parse(bounded.text);
    } catch {
      return gatewayError(400, "O corpo da requisição não contém JSON válido.");
    }
    if (
      !hasAllowedFields(parsed, operation.bodyFields ?? ["status"], [
        "status",
      ]) ||
      !parseOrderStatus(parsed.status)
    ) {
      return gatewayError(400, "Confira o status informado.");
    }
    body = parsed as OrderBody;
  } else if (request.body) {
    await request.body.cancel().catch(() => undefined);
    return gatewayError(400, "Esta operação não aceita corpo.");
  }

  const apiOrigin = getInternalApiOrigin();
  if (!apiOrigin)
    return gatewayError(503, "O serviço de pedidos está indisponível.");

  const targetUrl = new URL(operation.apiPath, `${apiOrigin}/`);
  if (status) targetUrl.searchParams.set("status", status);
  const headers = new Headers({ authorization: `Bearer ${sessionToken}` });
  if (body !== undefined) headers.set("content-type", "application/json");
  const result = await fetchApi(targetUrl, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (result.kind === "network-error")
    return gatewayError(502, "Não foi possível carregar pedidos agora.");
  if (result.kind === "invalid-json")
    return gatewayError(502, "A resposta do serviço de pedidos é inválida.");
  if (result.kind === "no-content") {
    return new Response(null, {
      status: result.response.status,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const successfulData = result.body as
    OrderResponse[] | OrderResponse | OrderSummary;
  return gatewayJsonResponse(
    result.response.ok
      ? successfulData
      : safeUpstreamError(
          result.body,
          safeOrderMessages,
          "Não foi possível processar pedidos agora.",
        ),
    result.response.status,
  );
}

export async function proxyAdminOrderRequest(
  request: Request,
  segments: string[],
): Promise<Response> {
  const operation = resolveAdminOrderOperation(segments);
  if (!operation) {
    return gatewayError(
      isMalformedOrderIdPath(segments) ? 400 : 404,
      isMalformedOrderIdPath(segments)
        ? "O identificador do pedido é inválido."
        : "Rota não encontrada.",
    );
  }
  return forwardAdminOrderRequest(request, operation);
}

function isValidPublicOrderBody(value: unknown): value is PublicOrderBody {
  if (!hasAllowedFields(value, ["items", "notes"], ["items"])) return false;
  if (
    "notes" in value &&
    (typeof value.notes !== "string" || value.notes.length > 200)
  ) {
    return false;
  }
  if (
    !Array.isArray(value.items) ||
    value.items.length < 1 ||
    value.items.length > 50
  ) {
    return false;
  }

  return value.items.every((item) => {
    if (
      !hasAllowedFields(
        item,
        ["productId", "quantity", "notes"],
        ["productId", "quantity"],
      )
    ) {
      return false;
    }
    return (
      typeof item.productId === "string" &&
      uuidPattern.test(item.productId) &&
      typeof item.quantity === "number" &&
      Number.isInteger(item.quantity) &&
      item.quantity >= 1 &&
      item.quantity <= 20 &&
      (!("notes" in item) ||
        (typeof item.notes === "string" && item.notes.length <= 200))
    );
  });
}

function isPublicOrderBody(value: unknown): value is PublicOrderBody {
  return isRecord(value) && isValidPublicOrderBody(value);
}

export async function proxyPublicTableOrdersRequest(
  request: Request,
  code: string,
): Promise<Response> {
  if (!publicCodePattern.test(code))
    return gatewayError(400, "O código da mesa é inválido.");

  const method = request.method.toUpperCase();
  if (method !== "GET" && method !== "POST") {
    return gatewayError(405, "Método não permitido para esta rota.");
  }
  if (new URL(request.url).searchParams.size > 0) {
    return gatewayError(400, "Os filtros informados não são permitidos.");
  }

  const isMutation = method === "POST";
  if (!isMutation && request.body) {
    await request.body.cancel().catch(() => undefined);
    return gatewayError(400, "Esta operação não aceita corpo.");
  }
  if (isMutation && !isTrustedMutationOrigin(request)) {
    return gatewayError(403, "Origem não autorizada.");
  }

  let body: PublicOrderBody | undefined;
  if (isMutation) {
    const contentType = request.headers
      .get("content-type")
      ?.split(";", 1)[0]
      .trim()
      .toLowerCase();
    if (contentType !== "application/json") {
      return gatewayError(415, "O corpo da requisição deve ser JSON.");
    }
    const bounded = await readBoundedBody(request);
    if (bounded.kind === "too-large")
      return gatewayError(413, "A requisição excede o tamanho permitido.");
    if (bounded.kind === "invalid")
      return gatewayError(400, "Não foi possível ler os dados enviados.");

    let parsed: unknown;
    try {
      parsed = JSON.parse(bounded.text);
    } catch {
      return gatewayError(400, "O corpo da requisição não contém JSON válido.");
    }
    if (!isPublicOrderBody(parsed))
      return gatewayError(400, "Confira os itens enviados.");
    body = parsed;
  }

  const apiOrigin = getInternalApiOrigin();
  if (!apiOrigin)
    return gatewayError(503, "O serviço de pedidos está indisponível.");

  const headers = new Headers();
  if (body !== undefined) {
    const gatewaySecret = process.env.AUTH_GATEWAY_SECRET;
    if (!gatewaySecret || gatewaySecret.length < 32) {
      return gatewayError(503, "O serviço de pedidos está indisponível.");
    }
    const sourceCheck = consumePublicOrderAttempt(request);
    if (!sourceCheck.allowed) {
      const message =
        sourceCheck.status === 429
          ? "Muitos pedidos enviados. Tente novamente em instantes."
          : "O serviço de pedidos está indisponível.";
      return gatewayError(
        sourceCheck.status,
        message,
        sourceCheck.retryAfterSeconds,
      );
    }

    headers.set(orderGatewaySecretHeader, gatewaySecret);
    if (sourceCheck.clientKey)
      headers.set(orderClientKeyHeader, sourceCheck.clientKey);
    headers.set("content-type", "application/json");
  }

  const result = await fetchApi(
    new URL(`/public/tables/${code}/orders`, `${apiOrigin}/`),
    {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    },
  );
  if (result.kind === "network-error")
    return gatewayError(502, "Não foi possível enviar o pedido agora.");
  if (result.kind === "invalid-json")
    return gatewayError(502, "A resposta de pedidos é inválida.");
  if (result.kind === "no-content")
    return gatewayError(502, "A resposta de pedidos é inválida.");

  const success = result.body as PublicMenu | PublicOrder | PublicOrderSummary;
  return gatewayJsonResponse(
    result.response.ok
      ? success
      : safeUpstreamError(
          result.body,
          safePublicOrderMessages,
          "Não foi possível processar pedidos agora.",
        ),
    result.response.status,
  );
}
