import type { ApiPaths } from '@comandinha/api-client';
import { requestPanelJson } from './panel-request';

export type PanelOrder = ApiPaths['/orders']['get']['responses'][200]['content']['application/json'][number];
type OrderQuery = NonNullable<ApiPaths['/orders']['get']['parameters']['query']>;
export type PanelOrderStatus = NonNullable<OrderQuery['status']>;
export type UpdatePanelOrderStatus = ApiPaths['/orders/{id}/status']['patch']['requestBody']['content']['application/json']['status'];
export type PanelOrderSummary = ApiPaths['/orders/summary']['get']['responses'][200]['content']['application/json'];

export function listOrders(status?: PanelOrderStatus): Promise<PanelOrder[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return requestPanelJson(`/api/admin/orders${query}`);
}

export function getOrderSummary(): Promise<PanelOrderSummary> {
  return requestPanelJson('/api/admin/orders/summary');
}

export function updateOrderStatus(
  id: string,
  status: UpdatePanelOrderStatus,
): Promise<PanelOrder> {
  return requestPanelJson(`/api/admin/orders/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
