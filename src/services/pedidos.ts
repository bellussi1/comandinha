import api from "./api";
import { TokenManager } from "./tokenManager";
import { mapearPedidoAPI, formatarPedidoParaAPI } from "@/src/adapters/pedidoAdapter";
import { API_ENDPOINTS } from "@/src/constants";
import type {
  Pedido,
  PedidoProducao,
  StatusPedido,
  ItemCarrinho,
} from "@/src/types";

/**
 * Busca os pedidos de uma mesa específica
 */
export const getPedidosPorMesa = async (mesa: string): Promise<Pedido[]> => {
  try {
    const response = await api.get(`${API_ENDPOINTS.MESAS}/${mesa}/pedidos`);

    if (!Array.isArray(response.data.pedidos)) {
      return [];
    }

    return response.data.pedidos.map((pedido: any) =>
      mapearPedidoAPI(pedido, mesa)
    );
  } catch (error) {
    console.error("Erro ao buscar pedidos da mesa:", error);
    return [];
  }
};

/**
 * Adiciona um novo pedido para uma mesa
 */
export const adicionarPedido = async (pedido: {
  mesa: string;
  itens: ItemCarrinho[];
  observacoesGerais?: string;
}): Promise<Pedido> => {
  try {
    const payload = formatarPedidoParaAPI(
      pedido.mesa,
      pedido.itens,
      pedido.observacoesGerais
    );

    const response = await api.post(API_ENDPOINTS.PEDIDOS, payload);

    return mapearPedidoAPI(response.data, pedido.mesa);
  } catch (error) {
    console.error("Erro ao adicionar pedido:", error);
    throw new Error("Não foi possível realizar o pedido");
  }
};

/**
 * Busca todos os pedidos em produção (para admin)
 */
export const getPedidosProducao = async (): Promise<PedidoProducao[]> => {
  try {
    const response = await api.get(`${API_ENDPOINTS.PEDIDOS}/producao`);
    return response.data;
  } catch (error) {
    console.error("Erro ao buscar pedidos em produção:", error);
    throw new Error("Não foi possível carregar os pedidos em produção");
  }
};

/**
 * Atualiza status de um pedido (versão para admins)
 */
export const atualizarStatusPedidoProducao = async (
  pedidoId: string,
  novoStatus: StatusPedido
): Promise<boolean> => {
  try {
    await api.patch(`${API_ENDPOINTS.PEDIDOS}/${pedidoId}/status`, { status: novoStatus });
    return true;
  } catch (error) {
    console.error("Erro ao atualizar status do pedido:", error);
    throw new Error("Não foi possível atualizar o status do pedido");
  }
};

/**
 * Atualiza status de um pedido (versão para clientes)
 */
export const atualizarStatusPedido = async (
  pedidoId: string,
  novoStatus: Pedido["status"],
  mesaId: string
): Promise<boolean> => {
  try {
    await api.patch(`${API_ENDPOINTS.PEDIDOS}/${pedidoId}/status`, { status: novoStatus });
    return true;
  } catch (error) {
    console.error("Erro ao atualizar status do pedido:", error);
    return false;
  }
};
