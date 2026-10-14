import { proxyAdminTableRequest } from "@/src/lib/server/tables-api";

type TableRouteContext = {
  params: Promise<{ segments: string[] }>;
};

async function proxy(
  request: Request,
  context: TableRouteContext,
): Promise<Response> {
  const { segments } = await context.params;
  return proxyAdminTableRequest(request, segments);
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
