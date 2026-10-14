import { proxyPublicTableMenuRequest } from "@/src/lib/server/tables-api";

type PublicMenuRouteContext = {
  params: Promise<{ code: string }>;
};

export async function GET(
  request: Request,
  context: PublicMenuRouteContext,
): Promise<Response> {
  const { code } = await context.params;
  return proxyPublicTableMenuRequest(request, code);
}
