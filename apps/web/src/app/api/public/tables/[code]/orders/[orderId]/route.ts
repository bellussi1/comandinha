import { proxyPublicTableOrdersRequest } from "@/src/lib/server/orders-api";

type PublicOrderRouteContext = {
  params: Promise<{ code: string; orderId: string }>;
};

export async function GET(
  request: Request,
  context: PublicOrderRouteContext,
): Promise<Response> {
  const { code, orderId } = await context.params;
  return proxyPublicTableOrdersRequest(request, code, orderId);
}
