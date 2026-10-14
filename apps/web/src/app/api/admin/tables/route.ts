import { proxyAdminTableRequest } from "@/src/lib/server/tables-api";

export function GET(request: Request): Promise<Response> {
  return proxyAdminTableRequest(request, []);
}

export function POST(request: Request): Promise<Response> {
  return proxyAdminTableRequest(request, []);
}
