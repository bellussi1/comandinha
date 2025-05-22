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
 * Busca os pedidos de uma mesa específica por ID da mesa
 */
export const getPedidosPorMesaId = async (mesaId: string): Promise<Pedido[]> => {
  try {
    // Buscar todos os produtos para ter acesso aos preços
    const produtosResponse = await api.get(`${API_ENDPOINTS.PRODUTOS}`);
    const produtos = produtosResponse.data;
    
    // Criar um mapa de nome do produto para seu preço
    const mapaProdutoPreco: Record<string, number> = {};
    produtos.forEach((produto: any) => {
      mapaProdutoPreco[produto.nome] = produto.preco;
    });
    
    console.log("Mapa de produtos e preços:", mapaProdutoPreco);
    
    // Buscar pedidos em produção
    const response = await api.get(`${API_ENDPOINTS.PEDIDOS}/producao`);
    const todosOsPedidos = response.data;
    
    // Filtrar apenas os pedidos da mesa especificada
    const pedidosDaMesa = todosOsPedidos.filter(
      (pedido: PedidoProducao) => pedido.mesaId.toString() === mesaId
    );
    
    // Log para debug - verificar estrutura completa
    console.log("Pedidos da mesa:", pedidosDaMesa);
    
    // Calcular valor total e mapear para o formato usado pela aplicação
    return pedidosDaMesa.map((pedido: PedidoProducao) => {
      // Mapear itens e calcular valores
      const itensComPreco = pedido.itens.map(item => {
        // Encontrar preço do produto no mapa
        const precoUnitario = mapaProdutoPreco[item.produtoNome] || 0;
        const subtotal = precoUnitario * item.quantidade;
        
        return {
          produtoId: 0,
          nome: item.produtoNome,
          quantidade: item.quantidade,
          precoUnitario: precoUnitario,
          observacoes: item.observacoes,
          subtotal: subtotal
        };
      });
      
      // Calcular valor total do pedido
      const valorTotal = itensComPreco.reduce((total, item) => total + item.subtotal, 0);
      
      return mapearPedidoAPI({
        pedidoId: pedido.pedidoId,
        timestamp: pedido.timestamp,
        status: pedido.status,
        itens: itensComPreco,
        valorTotal: valorTotal,
        estimativaEntrega: pedido.estimativaEntrega,
        observacoesGerais: pedido.observacoesGerais
      }, mesaId);
    });
  } catch (error) {
    console.error("Erro ao buscar pedidos da mesa:", error);
    return [];
  }
};

/**
 * Atualiza status de um pedido (versão para admins)
 */
export const atualizarStatusPedidoProducao = async (
  pedidoId: string,
  novoStatus: StatusPedido,
  mensagem?: string
): Promise<boolean> => {
  try {
    await api.patch(`${API_ENDPOINTS.PEDIDOS}/${pedidoId}/status`, { 
      status: novoStatus,
      mensagem: mensagem || ""
    });
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
  mesaId: string,
  mensagem?: string
): Promise<boolean> => {
  try {
    await api.patch(`${API_ENDPOINTS.PEDIDOS}/${pedidoId}/status`, { 
      status: novoStatus,
      mensagem: mensagem || ""
    });
    return true;
  } catch (error) {
    console.error("Erro ao atualizar status do pedido:", error);
    return false;
  }
};

/**
 * Exclui um pedido
 */
export const excluirPedido = async (pedidoId: string): Promise<boolean> => {
  try {
    await api.delete(`${API_ENDPOINTS.PEDIDOS}/${pedidoId}`);
    return true;
  } catch (error) {
    console.error("Erro ao excluir pedido:", error);
    throw new Error("Não foi possível excluir o pedido");
  }
};
