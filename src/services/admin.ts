// src/services/admin.ts
import api from "./api";
import { API_ENDPOINTS, STATUS } from "@/src/constants";
import { PedidoProducao, StatusPedido } from "@/src/types";

/**
 * Busca todos os pedidos que estão em produção
 * @returns Lista de pedidos em produção
 */
export const listarPedidosProducao = async (): Promise<PedidoProducao[]> => {
  try {
    const response = await api.get(`${API_ENDPOINTS.PEDIDOS}/producao`);
    // Não precisamos mais adicionar um ID, pois agora temos pedidoId na resposta
    return response.data;
  } catch (error) {
    console.error("Erro ao buscar pedidos em produção:", error);
    throw new Error("Falha ao carregar pedidos em produção");
  }
};

/**
 * Atualiza o status de um pedido
 * @param pedidoId ID do pedido
 * @param novoStatus Novo status para o pedido
 * @param mensagem Mensagem opcional sobre a atualização
 */
export const atualizarStatusPedido = async (
  pedidoId: string,
  novoStatus: StatusPedido,
  mensagem?: string
): Promise<boolean> => {
  try {
    const payload = {
      status: novoStatus,
      mensagem: mensagem || null,
    };

    await api.patch(`${API_ENDPOINTS.PEDIDOS}/${pedidoId}/status`, payload);
    return true;
  } catch (error) {
    console.error(`Erro ao atualizar status do pedido ${pedidoId}:`, error);
    throw new Error(`Não foi possível atualizar o pedido para ${novoStatus}`);
  }
};

/**
 * Confirma o recebimento de um pedido
 */
export const confirmarPedido = async (pedidoId: string): Promise<boolean> => {
  return atualizarStatusPedido(
    pedidoId,
    STATUS.CONFIRMADO as StatusPedido,
    "Pedido confirmado pelo restaurante"
  );
};

/**
 * Marca pedido como em preparação
 */
export const iniciarPreparacaoPedido = async (
  pedidoId: string
): Promise<boolean> => {
  return atualizarStatusPedido(
    pedidoId,
    STATUS.PREPARANDO as StatusPedido,
    "Pedido está sendo preparado"
  );
};

/**
 * Marca pedido como pronto para entrega
 */
export const marcarPedidoPronto = async (
  pedidoId: string
): Promise<boolean> => {
  return atualizarStatusPedido(
    pedidoId,
    STATUS.PRONTO as StatusPedido,
    "Pedido está pronto para entrega"
  );
};

/**
 * Marca pedido como entregue
 */
export const marcarPedidoEntregue = async (
  pedidoId: string
): Promise<boolean> => {
  return atualizarStatusPedido(
    pedidoId,
    STATUS.ENTREGUE as StatusPedido,
    "Pedido foi entregue ao cliente"
  );
};
