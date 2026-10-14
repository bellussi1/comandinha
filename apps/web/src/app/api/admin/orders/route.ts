import { proxyAdminOrderRequest } from "@/src/lib/server/orders-api";

export function GET(request: Request): Promise<Response> {
  return proxyAdminOrderRequest(request, []);
}
