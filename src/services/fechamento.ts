import { API_ENDPOINTS } from "@/src/constants";
import api from "./api";
import type { 
  MesaFechamento,
  PedidoFechamento,
  ItemConsolidado,
  ResumoFinanceiroMesa,
  FecharMesaRequest,
  FecharMesaResponse,
  StatusPedidoFechamento
} from "@/src/types";

/**
 * Busca todas as mesas ativas (ocupadas ou em processo de fechamento)
 */
export const getMesasAtivas = async (): Promise<MesaFechamento[]> => {
  try {
    // Busca todas as mesas primeiro
    const response = await api.get(`${API_ENDPOINTS.MESAS}`);
    const todasMesas = response.data;
    
    // Busca todos os pedidos em produção para identificar mesas com pedidos
    const pedidosResponse = await api.get(`${API_ENDPOINTS.PEDIDOS}/producao`);
    const pedidosProducao = pedidosResponse.data;
    
    // Agrupa pedidos por mesa
    const pedidosPorMesa = new Map<number, any[]>();
    pedidosProducao.forEach((pedido: any) => {
      if (!pedidosPorMesa.has(pedido.mesa_id)) {
        pedidosPorMesa.set(pedido.mesa_id, []);
      }
      pedidosPorMesa.get(pedido.mesa_id)!.push(pedido);
    });
    
    // Filtra mesas que têm pedidos ou estão ocupadas
    const mesasAtivas = todasMesas
      .filter((mesa: any) => {
        const temPedidos = pedidosPorMesa.has(mesa.id);
        const estaOcupada = mesa.status === 'ocupada';
        return temPedidos || estaOcupada;
      })
      .map((mesa: any) => {
        const pedidosDaMesa = pedidosPorMesa.get(mesa.id) || [];
        const valorTotal = pedidosDaMesa.reduce((total, pedido) => total + (pedido.valor_total || 0), 0);
        const pedidosAtivos = pedidosDaMesa.filter(p => 
          p.status === 'confirmado' || p.status === 'preparando'
        ).length;
        
        return {
          id: mesa.id,
          nome: mesa.nome,
          status: mesa.status || 'ocupada',
          tempoOcupacao: 0, // API não retorna tempo de ocupação
          totalPedidos: pedidosDaMesa.length,
          valorTotal,
          ultimaAtividade: new Date().toISOString(),
          pedidosAtivos
        };
      });

    return mesasAtivas;
  } catch (error) {
    console.error("Erro ao buscar mesas ativas:", error);
    throw error;
  }
};

/**
 * Busca todos os pedidos de uma mesa específica
 */
export const getPedidosMesa = async (
  mesaId: number, 
  status?: StatusPedidoFechamento
): Promise<PedidoFechamento[]> => {
  try {
    // Usa o endpoint correto da API
    const url = `${API_ENDPOINTS.MESAS}/${mesaId}/pedidos`;
    
    const response = await api.get(url);
    
    // Filtra por status se especificado
    let pedidos = response.data;
    if (status && status !== 'todos') {
      pedidos = pedidos.filter((pedido: any) => pedido.status === status);
    }
    
    return pedidos.map((pedido: any) => ({
      pedidoId: pedido.id,
      mesaId: mesaId,
      timestamp: pedido.timestamp,
      status: pedido.status,
      valorTotal: pedido.valor_total || 0,
      estimativaEntrega: pedido.estimativa_entrega || '',
      observacoesGerais: pedido.observacoes_gerais,
      itens: (pedido.itens || []).map((item: any) => ({
        produtoId: item.produto_id,
        nome: item.produto?.nome || 'Produto não encontrado',
        quantidade: item.quantidade,
        precoUnitario: item.preco_unitario || 0,
        subtotal: item.subtotal || (item.quantidade * (item.preco_unitario || 0)),
        observacoes: item.observacoes
      }))
    }));
  } catch (error) {
    console.error(`Erro ao buscar pedidos da mesa ${mesaId}:`, error);
    throw error;
  }
};

/**
 * Consolida itens de pedidos agrupando por produto
 */
export const consolidarItensPedidos = (pedidos: PedidoFechamento[]): ItemConsolidado[] => {
  const itensMap = new Map<number, ItemConsolidado>();
  
  pedidos.forEach((pedido) => {
    pedido.itens.forEach((item) => {
      const produtoId = item.produtoId;
      
      if (itensMap.has(produtoId)) {
        const itemExistente = itensMap.get(produtoId)!;
        itemExistente.quantidadeTotal += item.quantidade;
        itemExistente.subtotal += item.subtotal;
        itemExistente.pedidos.push(pedido.pedidoId);
        
        // Adiciona observações únicas
        if (item.observacoes && !itemExistente.observacoes.includes(item.observacoes)) {
          itemExistente.observacoes.push(item.observacoes);
        }
      } else {
        itensMap.set(produtoId, {
          produtoId,
          nome: item.nome,
          precoUnitario: item.precoUnitario,
          quantidadeTotal: item.quantidade,
          subtotal: item.subtotal,
          observacoes: item.observacoes ? [item.observacoes] : [],
          pedidos: [pedido.pedidoId]
        });
      }
    });
  });
  
  return Array.from(itensMap.values()).sort((a, b) => a.nome.localeCompare(b.nome));
};

/**
 * Gera resumo financeiro completo de uma mesa
 */
export const gerarResumoFinanceiro = async (mesaId: number): Promise<ResumoFinanceiroMesa> => {
  try {
    // Busca informações da mesa
    const mesaResponse = await api.get(`${API_ENDPOINTS.MESAS}/${mesaId}/status`);
    const mesa = mesaResponse.data;
    
    // Busca todos os pedidos da mesa
    const pedidos = await getPedidosMesa(mesaId);
    
    // Consolida itens por produto
    const itensConsolidados = consolidarItensPedidos(pedidos);
    
    // Calcula totais
    const subtotal = pedidos.reduce((total, pedido) => total + pedido.valorTotal, 0);
    
    return {
      mesaId,
      mesaNome: mesa.nome || `Mesa ${mesaId}`,
      pedidos,
      itensConsolidados,
      subtotal,
      desconto: 0, // Será aplicado no frontend
      taxaServico: 0, // Será aplicado no frontend  
      totalFinal: subtotal,
      inicioOcupacao: undefined, // API não retorna esta informação
      tempoTotal: undefined // API não retorna tempo de ocupação
    };
  } catch (error) {
    console.error(`Erro ao gerar resumo financeiro da mesa ${mesaId}:`, error);
    throw error;
  }
};

/**
 * Atualiza status de um pedido específico
 */
export const atualizarStatusPedido = async (
  pedidoId: number, 
  novoStatus: string
): Promise<boolean> => {
  try {
    await api.put(`${API_ENDPOINTS.PEDIDOS}/${pedidoId}/status`, {
      status: novoStatus
    });
    return true;
  } catch (error) {
    console.error(`Erro ao atualizar status do pedido ${pedidoId}:`, error);
    throw error;
  }
};

/**
 * Remove um pedido específico
 */
export const removerPedido = async (pedidoId: number): Promise<boolean> => {
  try {
    await api.delete(`${API_ENDPOINTS.PEDIDOS}/${pedidoId}`);
    return true;
  } catch (error) {
    console.error(`Erro ao remover pedido ${pedidoId}:`, error);
    throw error;
  }
};

/**
 * Fecha a conta de uma mesa (finaliza pedidos para controle gerencial)
 */
export const fecharContaMesa = async (
  mesaId: number,
  dadosFechamento: FecharMesaRequest = {}
): Promise<FecharMesaResponse> => {
  try {
    // Como não há endpoint específico para fechar mesa na API,
    // vamos marcar todos os pedidos da mesa como "entregue"
    const pedidos = await getPedidosMesa(mesaId);
    
    // Atualiza status de todos os pedidos pendentes para "entregue"
    await Promise.all(
      pedidos
        .filter(p => p.status !== 'entregue' && p.status !== 'cancelado')
        .map(pedido => atualizarStatusPedido(pedido.pedidoId, 'entregue'))
    );
    
    const valorTotal = pedidos.reduce((total, pedido) => total + pedido.valorTotal, 0);
    
    return {
      mesaId,
      valorTotal,
      status: 'fechada',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Erro ao fechar conta da mesa ${mesaId}:`, error);
    throw error;
  }
};

/**
 * Desativa uma mesa (libera para nova ocupação)
 */
export const desativarMesa = async (mesaId: number): Promise<boolean> => {
  try {
    await api.post(`${API_ENDPOINTS.MESAS}/${mesaId}/desativar`);
    return true;
  } catch (error) {
    console.error(`Erro ao desativar mesa ${mesaId}:`, error);
    throw error;
  }
};

/**
 * Valida se uma mesa pode ser fechada
 */
export const validarFechamentoMesa = async (mesaId: number): Promise<{
  podeFechar: boolean;
  motivo?: string;
  pedidosPendentes: number;
}> => {
  try {
    const pedidos = await getPedidosMesa(mesaId);
    const pedidosPendentes = pedidos.filter(p => 
      p.status === 'confirmado' || p.status === 'preparando'
    );
    
    const podeFechar = pedidosPendentes.length === 0;
    
    return {
      podeFechar,
      motivo: !podeFechar ? `Existem ${pedidosPendentes.length} pedido(s) ainda em preparo` : undefined,
      pedidosPendentes: pedidosPendentes.length
    };
  } catch (error) {
    console.error(`Erro ao validar fechamento da mesa ${mesaId}:`, error);
    return {
      podeFechar: false,
      motivo: 'Erro ao validar mesa',
      pedidosPendentes: 0
    };
  }
};