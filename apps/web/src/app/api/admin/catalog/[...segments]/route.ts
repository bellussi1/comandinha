import { proxyCatalogRequest } from "@/src/lib/server/catalog-api";

type CatalogRouteContext = {
  params: Promise<{ segments: string[] }>;
};

async function proxy(
  request: Request,
  context: CatalogRouteContext,
): Promise<Response> {
  const { segments } = await context.params;
  return proxyCatalogRequest(request, segments);
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
