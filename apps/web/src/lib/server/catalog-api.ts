import "server-only";
import type { ApiPaths } from "@comandinha/api-client";
import { readAdminSessionCookie } from "./auth-cookie";
import { isTrustedMutationOrigin } from "./auth-response";

type CreateCategoryBody =
  ApiPaths["/catalog/categories"]["post"]["requestBody"]["content"]["application/json"];
type UpdateCategoryBody =
  ApiPaths["/catalog/categories/{id}"]["patch"]["requestBody"]["content"]["application/json"];
type CreateProductBody =
  ApiPaths["/catalog/products"]["post"]["requestBody"]["content"]["application/json"];
type UpdateProductBody =
  ApiPaths["/catalog/products/{id}"]["patch"]["requestBody"]["content"]["application/json"];
type CatalogBody =
  | CreateCategoryBody
  | UpdateCategoryBody
  | CreateProductBody
  | UpdateProductBody;
type ProductQuery = NonNullable<
  ApiPaths["/catalog/products"]["get"]["parameters"]["query"]
>;
type CatalogOperation = {
  apiPath: string;
  allowedMethods: readonly string[];
  bodyFields?: readonly string[];
  requiredBodyFields?: readonly string[];
  queryMode?: "products";
};

const maxRequestBytes = 64 * 1024;
const requestTimeoutMs = 5_000;
const safeUpstreamMessages = new Set([
  "A category with this name already exists.",
  "This category still contains products.",
  "Category not found.",
  "Product not found.",
  "Only restaurant owners and administrators can change the catalog.",
  "Only restaurant owners and administrators can view archived products.",
]);
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const categoryFields = [
  "name",
  "description",
  "imageUrl",
  "displayOrder",
] as const;
const productFields = [
  "name",
  "description",
  "categoryId",
  "priceInCents",
  "imageUrl",
  "available",
  "featured",
  "dietaryTags",
  "prepTimeMinutes",
] as const;

type BodyReadResult =
  { kind: "ok"; text: string } | { kind: "too-large" } | { kind: "invalid" };

function jsonResponse(body: unknown, status: number): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function errorResponse(status: number, message: string): Response {
  return jsonResponse({ message }, status);
}

function resolveOperation(segments: string[]): CatalogOperation | undefined {
  if (segments.length === 1 && segments[0] === "categories") {
    return {
      apiPath: "/catalog/categories",
      allowedMethods: ["GET", "POST"],
      bodyFields: categoryFields,
      requiredBodyFields: ["name"],
    };
  }

  if (
    segments.length === 2 &&
    segments[0] === "categories" &&
    uuidPattern.test(segments[1])
  ) {
    return {
      apiPath: `/catalog/categories/${segments[1]}`,
      allowedMethods: ["GET", "PATCH", "DELETE"],
      bodyFields: categoryFields,
    };
  }

  if (segments.length === 1 && segments[0] === "products") {
    return {
      apiPath: "/catalog/products",
      allowedMethods: ["GET", "POST"],
      bodyFields: productFields,
      requiredBodyFields: ["name", "categoryId", "priceInCents"],
      queryMode: "products",
    };
  }

  if (
    segments.length === 2 &&
    segments[0] === "products" &&
    uuidPattern.test(segments[1])
  ) {
    return {
      apiPath: `/catalog/products/${segments[1]}`,
      allowedMethods: ["GET", "PATCH", "DELETE"],
      bodyFields: [...productFields, "isActive"],
    };
  }

  if (
    segments.length === 2 &&
    ["categories", "products"].includes(segments[0])
  ) {
    return undefined;
  }

  return undefined;
}

function hasMalformedResourceId(segments: string[]): boolean {
  return (
    segments.length === 2 &&
    ["categories", "products"].includes(segments[0]) &&
    !uuidPattern.test(segments[1])
  );
}

function parseProductQuery(
  request: Request,
  operation: CatalogOperation,
): ProductQuery | null {
  const searchParams = new URL(request.url).searchParams;
  const entries = [...searchParams.entries()];
  if (entries.length === 0) return {};
  if (operation.queryMode !== "products") return null;

  const values = new Map<string, string>();
  for (const [key, value] of entries) {
    if (!["categoryId", "includeArchived"].includes(key) || values.has(key))
      return null;
    values.set(key, value);
  }

  const categoryId = values.get("categoryId");
  const includeArchived = values.get("includeArchived");
  if (categoryId && !uuidPattern.test(categoryId)) return null;
  if (
    includeArchived !== undefined &&
    !["true", "false"].includes(includeArchived)
  ) {
    return null;
  }

  return {
    ...(categoryId ? { categoryId } : {}),
    ...(includeArchived !== undefined
      ? { includeArchived: includeArchived === "true" }
      : {}),
  };
}

async function readBodyWithinLimit(request: Request): Promise<BodyReadResult> {
  if (!request.body) return { kind: "ok", text: "" };
  const contentLength = request.headers.get("content-length");
  if (
    contentLength &&
    /^\d+$/.test(contentLength) &&
    Number(contentLength) > maxRequestBytes
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
      if (bytesRead > maxRequestBytes) {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAllowedBody(
  value: unknown,
  allowedFields: readonly string[],
  requiredFields: readonly string[],
): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  const fields = Object.keys(value);
  return (
    fields.length > 0 &&
    requiredFields.every((field) => field in value) &&
    fields.every((field) => allowedFields.includes(field))
  );
}

function getApiOrigin(): string | undefined {
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

function safeErrorPayload(
  value: unknown,
  status: number,
) {
  const record = isRecord(value) ? value : undefined;
  const rawMessage = record?.message;
  const messages = Array.isArray(rawMessage)
    ? rawMessage
        .filter((message): message is string => typeof message === "string")
        .slice(0, 10)
    : typeof rawMessage === "string"
      ? [rawMessage]
      : [];
  const message =
    messages.find((entry) => safeUpstreamMessages.has(entry)) ??
    "Não foi possível processar a solicitação do catálogo.";
  return { statusCode: status, message };
}

async function readUpstreamJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

export async function proxyCatalogRequest(
  request: Request,
  segments: string[],
): Promise<Response> {
  const operation = resolveOperation(segments);
  if (!operation) {
    return errorResponse(
      hasMalformedResourceId(segments) ? 400 : 404,
      hasMalformedResourceId(segments)
        ? "O identificador do recurso é inválido."
        : "Rota não encontrada.",
    );
  }

  const method = request.method.toUpperCase();
  if (!operation.allowedMethods.includes(method)) {
    return errorResponse(405, "Método não permitido para esta rota.");
  }

  const query = parseProductQuery(request, operation);
  if (query === null)
    return errorResponse(400, "Os filtros informados não são permitidos.");

  const isMutation =
    method === "POST" || method === "PATCH" || method === "DELETE";
  if (isMutation && !isTrustedMutationOrigin(request)) {
    return errorResponse(403, "Origem não autorizada.");
  }

  const sessionToken = await readAdminSessionCookie();
  if (!sessionToken || !/^[A-Za-z0-9_-]{43}$/.test(sessionToken)) {
    return errorResponse(401, "Sessão administrativa ausente ou inválida.");
  }

  let body: CatalogBody | undefined;
  if (method === "POST" || method === "PATCH") {
    const contentType = request.headers
      .get("content-type")
      ?.split(";", 1)[0]
      .trim()
      .toLowerCase();
    if (contentType !== "application/json") {
      return errorResponse(415, "O corpo da requisição deve ser JSON.");
    }

    const bodyResult = await readBodyWithinLimit(request);
    if (bodyResult.kind === "too-large") {
      return errorResponse(413, "A requisição excede o tamanho permitido.");
    }
    if (bodyResult.kind === "invalid") {
      return errorResponse(400, "Não foi possível ler os dados enviados.");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(bodyResult.text);
    } catch {
      return errorResponse(
        400,
        "O corpo da requisição não contém JSON válido.",
      );
    }
    if (
      !operation.bodyFields ||
      !isAllowedBody(
        parsed,
        operation.bodyFields,
        operation.requiredBodyFields ?? [],
      )
    ) {
      return errorResponse(400, "Confira os campos enviados.");
    }
    body = parsed as CatalogBody;
  } else if (request.body) {
    await request.body.cancel().catch(() => undefined);
    return errorResponse(400, "Esta operação não aceita corpo.");
  }

  const apiOrigin = getApiOrigin();
  if (!apiOrigin) return errorResponse(503, "O catálogo está indisponível.");

  const targetUrl = new URL(operation.apiPath, `${apiOrigin}/`);
  if (operation.queryMode === "products") {
    const productQuery = query as ProductQuery;
    const categoryId = productQuery.categoryId;
    const includeArchived = productQuery.includeArchived;
    if (categoryId) targetUrl.searchParams.set("categoryId", categoryId);
    if (includeArchived !== undefined) {
      targetUrl.searchParams.set("includeArchived", String(includeArchived));
    }
  }

  const headers = new Headers({ authorization: `Bearer ${sessionToken}` });
  if (body !== undefined) headers.set("content-type", "application/json");

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, {
      method,
      headers,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(requestTimeoutMs),
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    return errorResponse(502, "Não foi possível carregar o catálogo agora.");
  }

  if (upstream.status === 204) {
    return new Response(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const upstreamBody = await readUpstreamJson(upstream);
  if (upstreamBody === undefined) {
    return errorResponse(502, "A resposta do catálogo é inválida.");
  }

  return jsonResponse(
    upstream.ok
      ? upstreamBody
      : safeErrorPayload(upstreamBody, upstream.status),
    upstream.status,
  );
}
