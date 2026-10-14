import { proxyAdminOrderRequest } from "@/src/lib/server/orders-api";

type OrderRouteContext = {
  params: Promise<{ segments: string[] }>;
};

async function proxy(
  request: Request,
  context: OrderRouteContext,
): Promise<Response> {
  const { segments } = await context.params;
  return proxyAdminOrderRequest(request, segments);
}

export const GET = proxy;
export const PATCH = proxy;
