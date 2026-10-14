import api from "./api";
import type { CriarChamadoRequest, ChamadoResponse, Chamado } from "@/src/types";

/**
 * Criar um novo chamado de garçom
 */
export async function criarChamado(mesaUuid: string): Promise<Chamado> {
  const request = {
    mesa_uuid: mesaUuid,
    motivo: 1, // Valor padrão obrigatório pela API
    detalhes: "Chamada de garçom", // Valor padrão obrigatório pela API
  };

  const response = await api.post<ChamadoResponse>("/chamadas", request);
  return adaptarChamadoResponse(response.data);
}

/**
 * Cancelar um chamado existente
 */
export async function cancelarChamado(
  chamadoId: number,
  mesaUuid: string
): Promise<Chamado> {
  const response = await api.patch<ChamadoResponse>(
    `/chamadas/${chamadoId}/cancelar`,
    { mesa_uuid: mesaUuid }
  );
  return adaptarChamadoResponse(response.data);
}

/**
 * Marcar chamado como atendido (Admin)
 */
export async function atenderChamado(chamadoId: number): Promise<Chamado> {
  const response = await api.patch<ChamadoResponse>(
    `/chamadas/${chamadoId}/atender`
  );
  return adaptarChamadoResponse(response.data);
}

/**
 * Listar chamados pendentes (Admin)
 */
export async function listarChamadosPendentes(): Promise<Chamado[]> {
  const response = await api.get<ChamadoResponse[]>("/chamadas/pendentes");
  return response.data.map(adaptarChamadoResponse);
}

/**
 * Buscar histórico de chamados (Admin)
 */
export async function buscarHistoricoChamados(
  filtros?: {
    status?: string;
    mesa_uuid?: string;
    desde?: string;
  }
): Promise<Chamado[]> {
  const params = new URLSearchParams();
  if (filtros?.status) params.append("status", filtros.status);
  if (filtros?.mesa_uuid) params.append("mesa_uuid", filtros.mesa_uuid);
  if (filtros?.desde) params.append("desde", filtros.desde);

  const response = await api.get<ChamadoResponse[]>(
    `/chamadas/historico?${params.toString()}`
  );
  return response.data.map(adaptarChamadoResponse);
}

/**
 * Buscar histórico de chamados de uma mesa específica
 */
export async function buscarHistoricoMesa(mesaUuid: string): Promise<Chamado[]> {
  const response = await api.get<ChamadoResponse[]>(
    `/mesas/uuid/${mesaUuid}/chamadas`
  );
  return response.data.map(adaptarChamadoResponse);
}

/**
 * Adaptar resposta da API para o formato interno
 */
function adaptarChamadoResponse(response: ChamadoResponse): Chamado {
  return {
    id: response.id,
    mesaUuid: response.mesa_uuid,
    status: response.status as "pendente" | "atendido" | "cancelado",
    criadoEm: response.criado_em,
    atualizadoEm: response.atualizado_em,
  };
}
