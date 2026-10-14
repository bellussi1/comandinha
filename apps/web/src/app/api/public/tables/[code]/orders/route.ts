import { proxyPublicTableOrdersRequest } from "@/src/lib/server/orders-api";

type PublicOrdersRouteContext = {
  params: Promise<{ code: string }>;
};

async function proxy(
  request: Request,
  context: PublicOrdersRouteContext,
): Promise<Response> {
  const { code } = await context.params;
  return proxyPublicTableOrdersRequest(request, code);
}

export const GET = proxy;
export const POST = proxy;
