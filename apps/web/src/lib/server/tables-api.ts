import "server-only";
import type { ApiPaths } from "@comandinha/api-client";
import { readAdminSessionCookie } from "./auth-cookie";
import { isTrustedMutationOrigin } from "./auth-response";
import {
  fetchApi,
  gatewayError,
  gatewayJsonResponse,
  getInternalApiOrigin,
  hasAllowedFields,
  readBoundedBody,
  safeUpstreamError,
} from "./api-gateway";

type TableResponse =
  ApiPaths["/tables"]["get"]["responses"][200]["content"]["application/json"][number];
type CreateTableBody =
  ApiPaths["/tables"]["post"]["requestBody"]["content"]["application/json"];
type UpdateTableBody =
  ApiPaths["/tables/{id}"]["patch"]["requestBody"]["content"]["application/json"];
type TableBody = CreateTableBody | UpdateTableBody;

type TableOperation = {
  apiPath: string;
  methods: readonly ("GET" | "POST" | "PATCH")[];
  bodyFields?: readonly string[];
  requiredFields?: readonly string[];
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const publicCodePattern = /^[A-Za-z0-9_-]{43}$/;
const tableFields = ["name", "isActive"] as const;
const safeTableMessages = new Set([
  "Table not found.",
  "A table with this name already exists.",
  "Only restaurant owners and administrators can change tables.",
]);

function resolveTableOperation(segments: string[]): TableOperation | undefined {
  if (segments.length === 0) {
    return {
      apiPath: "/tables",
      methods: ["GET", "POST"],
      bodyFields: ["name"],
      requiredFields: ["name"],
    };
  }

  if (segments.length === 1 && uuidPattern.test(segments[0])) {
    return {
      apiPath: `/tables/${segments[0]}`,
      methods: ["GET", "PATCH"],
      bodyFields: tableFields,
    };
  }

  return undefined;
}

function isMalformedIdPath(segments: string[]): boolean {
  return segments.length === 1 && !uuidPattern.test(segments[0]);
}

function isValidTableBody(
  value: unknown,
  method: "POST" | "PATCH",
  allowedFields: readonly string[],
  requiredFields: readonly string[],
): value is TableBody {
  if (!hasAllowedFields(value, allowedFields, requiredFields)) {
    return false;
  }

  if (method === "POST" && typeof value.name !== "string") return false;
  if (
    "name" in value &&
    (typeof value.name !== "string" ||
      value.name.trim().length === 0 ||
      value.name.length > 80)
  ) {
    return false;
  }
  if ("isActive" in value && typeof value.isActive !== "boolean") return false;

  return method === "POST" || Object.keys(value).length > 0;
}

function clientErrorResponse(status: number, message: string): Response {
  return gatewayError(status, message);
}

async function forwardAdminTableRequest(
  request: Request,
  operation: TableOperation,
): Promise<Response> {
  const method =
    request.method.toUpperCase() as TableOperation["methods"][number];
  if (!operation.methods.includes(method)) {
    return clientErrorResponse(405, "Método não permitido para esta rota.");
  }

  if (new URL(request.url).searchParams.size > 0) {
    return clientErrorResponse(
      400,
      "Os filtros informados não são permitidos.",
    );
  }

  const isMutation = method === "POST" || method === "PATCH";
  if (isMutation && !isTrustedMutationOrigin(request)) {
    return clientErrorResponse(403, "Origem não autorizada.");
  }

  const sessionToken = await readAdminSessionCookie();
  if (!sessionToken || !/^[A-Za-z0-9_-]{43}$/.test(sessionToken)) {
    return clientErrorResponse(
      401,
      "Sessão administrativa ausente ou inválida.",
    );
  }

  let body: TableBody | undefined;
  if (isMutation) {
    const contentType = request.headers
      .get("content-type")
      ?.split(";", 1)[0]
      .trim()
      .toLowerCase();
    if (contentType !== "application/json") {
      return clientErrorResponse(415, "O corpo da requisição deve ser JSON.");
    }

    const bounded = await readBoundedBody(request);
    if (bounded.kind === "too-large") {
      return clientErrorResponse(
        413,
        "A requisição excede o tamanho permitido.",
      );
    }
    if (bounded.kind === "invalid") {
      return clientErrorResponse(
        400,
        "Não foi possível ler os dados enviados.",
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(bounded.text);
    } catch {
      return clientErrorResponse(
        400,
        "O corpo da requisição não contém JSON válido.",
      );
    }
    if (
      !isValidTableBody(
        parsed,
        method,
        operation.bodyFields ?? [],
        operation.requiredFields ?? [],
      )
    ) {
      return clientErrorResponse(400, "Confira os campos enviados.");
    }
    body = parsed;
  } else if (request.body) {
    await request.body.cancel().catch(() => undefined);
    return clientErrorResponse(400, "Esta operação não aceita corpo.");
  }

  const apiOrigin = getInternalApiOrigin();
  if (!apiOrigin)
    return clientErrorResponse(503, "O serviço de mesas está indisponível.");

  const headers = new Headers({ authorization: `Bearer ${sessionToken}` });
  if (body !== undefined) headers.set("content-type", "application/json");
  const result = await fetchApi(new URL(operation.apiPath, `${apiOrigin}/`), {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (result.kind === "network-error") {
    return clientErrorResponse(502, "Não foi possível carregar mesas agora.");
  }
  if (result.kind === "invalid-json") {
    return clientErrorResponse(
      502,
      "A resposta do serviço de mesas é inválida.",
    );
  }
  if (result.kind === "no-content") {
    return new Response(null, {
      status: result.response.status,
      headers: { "Cache-Control": "no-store" },
    });
  }

  return gatewayJsonResponse(
    result.response.ok
      ? (result.body as TableResponse | TableResponse[])
      : safeUpstreamError(
          result.body,
          safeTableMessages,
          "Não foi possível processar mesas agora.",
        ),
    result.response.status,
  );
}

export async function proxyAdminTableRequest(
  request: Request,
  segments: string[],
): Promise<Response> {
  const operation = resolveTableOperation(segments);
  if (!operation) {
    return clientErrorResponse(
      isMalformedIdPath(segments) ? 400 : 404,
      isMalformedIdPath(segments)
        ? "O identificador da mesa é inválido."
        : "Rota não encontrada.",
    );
  }
  return forwardAdminTableRequest(request, operation);
}

export async function proxyPublicTableMenuRequest(
  request: Request,
  code: string,
): Promise<Response> {
  if (!publicCodePattern.test(code)) {
    return clientErrorResponse(400, "O código da mesa é inválido.");
  }
  if (request.method.toUpperCase() !== "GET") {
    return clientErrorResponse(405, "Método não permitido para esta rota.");
  }
  if (new URL(request.url).searchParams.size > 0 || request.body) {
    if (request.body) await request.body.cancel().catch(() => undefined);
    return clientErrorResponse(400, "A consulta não aceita filtros ou corpo.");
  }

  const apiOrigin = getInternalApiOrigin();
  if (!apiOrigin)
    return clientErrorResponse(503, "O cardápio está indisponível.");

  const result = await fetchApi(
    new URL(`/public/tables/${code}/menu`, `${apiOrigin}/`),
    { method: "GET", headers: new Headers() },
  );
  if (result.kind === "network-error") {
    return clientErrorResponse(
      502,
      "Não foi possível carregar o cardápio agora.",
    );
  }
  if (result.kind === "invalid-json") {
    return clientErrorResponse(502, "A resposta do cardápio é inválida.");
  }
  if (result.kind === "no-content") {
    return clientErrorResponse(502, "A resposta do cardápio é inválida.");
  }

  return gatewayJsonResponse(
    result.response.ok
      ? result.body
      : safeUpstreamError(
          result.body,
          new Set(["Table not found."]),
          "Não foi possível carregar o cardápio agora.",
        ),
    result.response.status,
  );
}
