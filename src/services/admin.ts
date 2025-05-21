// src/services/admin.ts
import api from "./api";
import { PedidoProducao, StatusPedido } from "@/src/types";

/**
 * Busca todos os pedidos que estão em produção
 * @returns Lista de pedidos em produção
 */
export const listarPedidosProducao = async (): Promise<PedidoProducao[]> => {
  try {
    const response = await api.get("/pedidos/producao");

    // Garantir que cada pedido tenha um ID
    const pedidosComId = response.data.map((pedido: any, index: number) => ({
      ...pedido,
      id: pedido.id || `temp-${index}-${new Date().getTime()}`,
    }));

    return pedidosComId;
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

    await api.patch(`/pedidos/${pedidoId}/status`, payload);
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
    "confirmado",
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
    "preparando",
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
    "pronto",
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
    "entregue",
    "Pedido foi entregue ao cliente"
  );
};
