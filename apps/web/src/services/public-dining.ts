import type { ApiPaths } from "@comandinha/api-client";

export type PublicDiningMenu =
  ApiPaths["/public/tables/{code}/menu"]["get"]["responses"][200]["content"]["application/json"];
export type PublicMenuProduct = PublicDiningMenu["categories"][number]["products"][number];
export type PublicOrderPayload =
  ApiPaths["/public/tables/{code}/orders"]["post"]["requestBody"]["content"]["application/json"];
export type PublicOrderResponse =
  ApiPaths["/public/tables/{code}/orders"]["post"]["responses"][201]["content"]["application/json"];
export type PublicOrderSummary =
  ApiPaths["/public/tables/{code}/orders"]["get"]["responses"][200]["content"]["application/json"][number];
export type PublicOrderSummaryById =
  ApiPaths["/public/tables/{code}/orders/{orderId}"]["get"]["responses"][200]["content"]["application/json"];
export type PublicOrderStatus = PublicOrderSummary["status"];

export class PublicDiningRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "PublicDiningRequestError";
  }
}

async function requestPublicJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      cache: "no-store",
      headers: {
        ...(init.body !== undefined ? { "content-type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new PublicDiningRequestError(0, "Não foi possível conectar ao cardápio.");
  }

  if (!response.ok) {
    let message: string | undefined;
    try {
      const payload = (await response.json()) as { message?: unknown };
      if (typeof payload.message === "string") message = payload.message;
    } catch {
      // Keep HTML and malformed gateway responses generic in the public flow.
    }
    const fallback =
      response.status === 404
        ? "Este cardápio não está disponível. Confira o código QR da mesa."
        : response.status === 429
          ? "Muitas tentativas em sequência. Aguarde um pouco e tente novamente."
        : "Não foi possível carregar os dados agora. Tente novamente.";
    const localizedMessages: Record<string, string> = {
      "Table not found.": "Este cardápio não está disponível. Confira o código QR da mesa.",
      "Order not found.": "Este pedido não está disponível para esta mesa.",
      "One or more products are invalid.":
        "Um ou mais itens mudaram no cardápio. Revise seu pedido e tente novamente.",
      "One or more products are unavailable.":
        "Um ou mais itens acabaram. Revise seu pedido e tente novamente.",
    };
    throw new PublicDiningRequestError(
      response.status,
      localizedMessages[message ?? ""] ?? message ?? fallback,
    );
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new PublicDiningRequestError(502, "O servidor retornou uma resposta inválida.");
  }
}

function tablePath(code: string, resource: "menu" | "orders"): string {
  return `/api/public/tables/${encodeURIComponent(code)}/${resource}`;
}

export function getPublicMenu(code: string): Promise<PublicDiningMenu> {
  return requestPublicJson(tablePath(code, "menu"));
}

export function submitPublicOrder(
  code: string,
  payload: PublicOrderPayload,
): Promise<PublicOrderResponse> {
  return requestPublicJson(tablePath(code, "orders"), {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listPublicOrderSummaries(code: string): Promise<PublicOrderSummary[]> {
  return requestPublicJson(tablePath(code, "orders"));
}

export function getPublicOrderSummary(
  code: string,
  orderId: string,
): Promise<PublicOrderSummaryById> {
  return requestPublicJson(
    `${tablePath(code, "orders")}/${encodeURIComponent(orderId)}`,
  );
}
