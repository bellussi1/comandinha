import type { ApiPaths } from '@comandinha/api-client';
import { requestPanelJson } from './panel-request';

export type PanelTable = ApiPaths['/tables']['get']['responses'][200]['content']['application/json'][number];
export type CreatePanelTable = ApiPaths['/tables']['post']['requestBody']['content']['application/json'];
export type UpdatePanelTable = ApiPaths['/tables/{id}']['patch']['requestBody']['content']['application/json'];
export type PanelDiningSession = ApiPaths['/tables/{id}/session']['post']['responses'][201]['content']['application/json'];
export type PanelDiningSessionEnvelope = ApiPaths['/tables/{id}/session']['get']['responses'][200]['content']['application/json'];

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

export function openTableSession(tableId: string): Promise<PanelDiningSession> {
  return requestPanelJson(
    `/api/admin/tables/${encodeURIComponent(tableId)}/session`,
    { method: 'POST' },
  );
}

export function getTableSession(
  tableId: string,
): Promise<PanelDiningSessionEnvelope> {
  return requestPanelJson(
    `/api/admin/tables/${encodeURIComponent(tableId)}/session`,
  );
}

export function closeTableSession(
  sessionId: string,
): Promise<PanelDiningSession> {
  return requestPanelJson(
    `/api/admin/sessions/${encodeURIComponent(sessionId)}/close`,
    { method: 'POST' },
  );
}
