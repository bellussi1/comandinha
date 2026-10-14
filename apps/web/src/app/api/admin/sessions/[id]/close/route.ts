import { proxyAdminSessionCloseRequest } from "@/src/lib/server/tables-api";

type SessionCloseRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: Request,
  context: SessionCloseRouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return proxyAdminSessionCloseRequest(request, id);
}
