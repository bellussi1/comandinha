import type { ApiPaths } from '@comandinha/api-client';
import { requestPanelJson } from './panel-request';

export type PanelTable = ApiPaths['/tables']['get']['responses'][200]['content']['application/json'][number];
export type CreatePanelTable = ApiPaths['/tables']['post']['requestBody']['content']['application/json'];
export type UpdatePanelTable = ApiPaths['/tables/{id}']['patch']['requestBody']['content']['application/json'];

export function listTables(): Promise<PanelTable[]> {
  return requestPanelJson('/api/admin/tables');
}

export function createTable(payload: CreatePanelTable): Promise<PanelTable> {
  return requestPanelJson('/api/admin/tables', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateTable(
  id: string,
  payload: UpdatePanelTable,
): Promise<PanelTable> {
  return requestPanelJson(`/api/admin/tables/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
