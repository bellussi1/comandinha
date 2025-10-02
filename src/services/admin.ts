// src/services/admin.ts
import api from "./api";
import {
  API_ENDPOINTS,
  STATUS,
  STATUS_IDS,
  STATUS_STRING_TO_ID,
} from "@/src/constants";
import { PedidoProducao, StatusPedido } from "@/src/types";
import { atualizarStatusPedido as atualizarStatusFechamento } from "./fechamento";

/**
 * Busca todos os pedidos que estão em produção (apenas pendente e em preparo)
 * @returns Lista de pedidos em produção
 */
export const listarPedidosProducao = async (): Promise<PedidoProducao[]> => {
  try {
    const response = await api.get(`${API_ENDPOINTS.PEDIDOS}/producao`);
    return response.data;
  } catch (error) {
    console.error("Erro ao buscar pedidos em produção:", error);
    throw new Error("Falha ao carregar pedidos em produção");
  }
};

/**
 * Busca todos os pedidos ativos do sistema (exceto concluídos)
 * @returns Lista de pedidos ativos (pendente, em preparo, entregue)
 */
export const listarTodosPedidos = async (): Promise<PedidoProducao[]> => {
  try {
    // Usar endpoint /pedidos que lista todos exceto concluídos
    // Este endpoint requer token de admin
    const response = await api.get(`${API_ENDPOINTS.PEDIDOS}`);

    // Tratamento defensivo para garantir que temos um array
    const data = response.data;

    if (!data) {
      console.warn("API retornou dados vazios");
      return [];
    }

    // Função para mapear dados da API para PedidoProducao
    const mapearPedido = (pedidoAPI: any): PedidoProducao => ({
      pedidoId: pedidoAPI.id || pedidoAPI.pedidoId || 0,
      mesaId: pedidoAPI.mesa_id || pedidoAPI.mesaId,
      mesaUuid: pedidoAPI.mesa_uuid || pedidoAPI.mesaUuid || "",
      mesaNome:
        pedidoAPI.mesa?.nome ||
        pedidoAPI.mesaNome ||
        `Mesa ${pedidoAPI.mesa_id || "?"}`,
      timestamp:
        pedidoAPI.timestamp || pedidoAPI.created_at || new Date().toISOString(),
      status: pedidoAPI.status || "pendente",
      observacoesGerais:
        pedidoAPI.observacoes_gerais || pedidoAPI.observacoesGerais || null,
      estimativaEntrega:
        pedidoAPI.estimativa_entrega || pedidoAPI.estimativaEntrega || "",
      itens: Array.isArray(pedidoAPI.itens)
        ? pedidoAPI.itens.map((item: any) => ({
            produtoNome:
              item.produto?.nome ||
              item.produtoNome ||
              "Produto não encontrado",
            produtoDescricao:
              item.produto?.descricao || item.produtoDescricao || null,
            produtoAdicionais: Array.isArray(item.produtoAdicionais)
              ? item.produtoAdicionais
              : null,
            quantidade: item.quantidade || 1,
            observacoes: item.observacoes || null,
          }))
        : [],
    });

    let pedidosArray: any[] = [];

    // Se a resposta é um array, usar diretamente
    if (Array.isArray(data)) {
      pedidosArray = data;
    }
    // Se a resposta é um objeto com propriedade que contém os pedidos
    else if (data.pedidos && Array.isArray(data.pedidos)) {
      pedidosArray = data.pedidos;
    } else if (data.data && Array.isArray(data.data)) {
      pedidosArray = data.data;
    } else if (data.items && Array.isArray(data.items)) {
      pedidosArray = data.items;
    }

    // Mapear todos os pedidos para garantir estrutura consistente
    return pedidosArray.map(mapearPedido);
  } catch (error) {
    console.error("Erro ao buscar pedidos ativos:", error);

    // Se der erro 404 ou similar, retornar array vazio ao invés de lançar erro
    if ((error as any)?.response?.status === 404) {
      return [];
    }

    throw new Error("Falha ao carregar pedidos");
  }
};

/**
 * Atualiza o status de um pedido usando a nova API com status_id
 * @param pedidoId ID do pedido
 * @param novoStatus Novo status para o pedido
 * @param statusAtual Status atual do pedido (opcional)
 * @param mensagem Mensagem opcional (não usado na nova API)
 */
export const atualizarStatusPedido = async (
  pedidoId: string,
  novoStatus: StatusPedido,
  statusAtual?: string,
  mensagem?: string
): Promise<boolean> => {
  try {
    // Converter status string para status_id usando o mapeamento
    const statusId = STATUS_STRING_TO_ID[novoStatus];

    if (!statusId) {
      throw new Error(`Status inválido: ${novoStatus}`);
    }

    // Usar a função refatorada de fechamento com validação
    await atualizarStatusFechamento(Number(pedidoId), statusId, statusAtual);
    return true;
  } catch (error) {
    console.error(`Erro ao atualizar status do pedido ${pedidoId}:`, error);
    throw error;
  }
};

// Funções de conveniência para atualizar status específicos

/**
 * Marca pedido como pendente
 */
export const marcarPedidoPendente = async (
  pedidoId: string
): Promise<boolean> => {
  return atualizarStatusPedido(pedidoId, STATUS.PENDENTE as StatusPedido);
};

/**
 * Marca pedido como em preparação
 */
export const iniciarPreparacaoPedido = async (
  pedidoId: string
): Promise<boolean> => {
  return atualizarStatusPedido(pedidoId, STATUS.EM_PREPARO as StatusPedido);
};

/**
 * Marca pedido como entregue
 */
export const marcarPedidoEntregue = async (
  pedidoId: string
): Promise<boolean> => {
  return atualizarStatusPedido(pedidoId, STATUS.ENTREGUE as StatusPedido);
};

/**
 * Marca pedido como concluído
 */
export const marcarPedidoConcluido = async (
  pedidoId: string
): Promise<boolean> => {
  return atualizarStatusPedido(pedidoId, STATUS.CONCLUIDO as StatusPedido);
};

// Manter função legacy para compatibilidade
export const confirmarPedido = marcarPedidoPendente;
