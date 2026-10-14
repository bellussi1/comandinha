import {
  API_ENDPOINTS,
  STATUS_ID_TO_STRING,
  STATUS_STRING_TO_ID,
} from "@/src/constants";
import api from "./api";
import type {
  MesaFechamento,
  PedidoFechamento,
  ItemConsolidado,
  ResumoFinanceiroMesa,
  FecharMesaRequest,
  FecharMesaResponse,
  StatusPedidoFechamento,
  FiltrosPedidos,
  ChamadaServico,
  CriarChamadaRequest,
  PedidoStatusUpdateRequest,
  PedidoStatusUpdateResponse,
} from "@/src/types";
import { STATUS_PEDIDO_MAP } from "@/src/types";

/**
 * Busca todas as mesas ativas (ocupadas ou em processo de fechamento)
 */
export const getMesasAtivas = async (): Promise<MesaFechamento[]> => {
  try {
    // Busca todas as mesas primeiro
    const response = await api.get(`${API_ENDPOINTS.MESAS}`);
    const todasMesas = response.data;

    // Para cada mesa, verifica se tem pedidos
    const mesasComPedidos: MesaFechamento[] = [];

    await Promise.all(
      todasMesas.map(async (mesa: any) => {
        try {
          // Tenta buscar pedidos da mesa
          const pedidosResponse = await api.get(
            `${API_ENDPOINTS.MESAS}/${mesa.id}/pedidos`
          );
          const pedidos = pedidosResponse.data;

          if (pedidos && pedidos.length > 0) {
            // Filtra pedidos concluídos - não considerar no cálculo
            const pedidosNaoConcluidos = pedidos.filter(
              (p: any) => p.status !== "concluido"
            );

            // Se só tem pedidos concluídos, não mostra a mesa
            if (pedidosNaoConcluidos.length === 0) {
              return;
            }

            // Calcula valores totais apenas com pedidos não concluídos
            const valorTotal = pedidosNaoConcluidos.reduce((total: number, pedido: any) => {
              return total + (pedido.valorTotal || 0);
            }, 0);

            const pedidosAtivos = pedidosNaoConcluidos.filter(
              (p: any) => p.status === "pendente" || p.status === "em preparo"
            ).length;

            mesasComPedidos.push({
              id: mesa.id,
              nome: mesa.nome,
              status: "em uso" as const,
              tempoOcupacao: 0,
              totalPedidos: pedidosNaoConcluidos.length,
              valorTotal,
              ultimaAtividade: new Date().toISOString(),
              pedidosAtivos,
            });
          }
        } catch (error) {
          // Se der erro 404, a mesa não tem pedidos, ignora
          if ((error as any).response?.status !== 404) {
            console.error(
              `Erro ao verificar pedidos da mesa ${mesa.id}:`,
              error
            );
          }
        }
      })
    );

    return mesasComPedidos.sort((a, b) => a.id - b.id);
  } catch (error) {
    console.error("Erro ao buscar mesas ativas:", error);
    throw error;
  }
};

/**
 * Busca todos os pedidos de uma mesa específica (incluindo concluídos)
 * Usado na tela de fechamento para ver histórico completo da mesa
 */
export const getPedidosMesa = async (
  mesaId: number,
  status?: StatusPedidoFechamento,
  filtros?: FiltrosPedidos
): Promise<PedidoFechamento[]> => {
  try {
    // Usa o endpoint da mesa que retorna TODOS os pedidos (incluindo concluídos)
    let url = `${API_ENDPOINTS.MESAS}/${mesaId}/pedidos`;

    // Adiciona parâmetros de query baseados nos novos filtros da API
    const params = new URLSearchParams();

    // Filtro por status (múltiplos valores suportados pela API)
    if (status && status !== "todos") {
      params.append("status", status);
    } else if (filtros?.status) {
      params.append("status", filtros.status);
    }

    // Filtro por data (novo na API)
    if (filtros?.desde) {
      params.append("desde", filtros.desde);
    }

    // Adiciona parâmetros à URL se existirem
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await api.get(url);

    // Como a API agora suporta filtros nativamente, não precisamos filtrar no frontend
    let pedidos = response.data;

    // Buscar todos os produtos para ter acesso aos preços
    const produtosResponse = await api.get(`${API_ENDPOINTS.PRODUTOS}`);
    const produtos = produtosResponse.data;

    // Criar um mapa de nome do produto para seu preço
    const mapaProdutoPreco: Record<string, number> = {};
    produtos.forEach((produto: any) => {
      mapaProdutoPreco[produto.nome] = produto.preco;
    });

    return pedidos.map((pedido: any) => ({
      pedidoId: pedido.pedidoId,
      mesaId: mesaId,
      timestamp: pedido.timestamp,
      status:
        pedido.status || STATUS_PEDIDO_MAP[pedido.statusId] || "desconhecido",
      status_id: pedido.statusId || 1,
      valorTotal: pedido.valorTotal || 0,
      estimativaEntrega: pedido.estimativaEntrega || "",
      observacoesGerais: pedido.observacoesGerais,
      itens: (pedido.itens || []).map((item: any) => {
        // Encontrar preço do produto no mapa usando o nome
        const precoUnitario = mapaProdutoPreco[item.produtoNome] || 0;
        const subtotal = precoUnitario * item.quantidade;

        return {
          produtoId: 0, // API não retorna produtoId neste endpoint
          nome: item.produtoNome || "Produto não encontrado",
          quantidade: item.quantidade,
          precoUnitario: precoUnitario,
          subtotal: subtotal,
          observacoes: item.observacoes,
        };
      }),
    }));
  } catch (error) {
    console.error(`Erro ao buscar pedidos da mesa ${mesaId}:`, error);
    throw error;
  }
};

/**
 * Consolida itens de pedidos agrupando por produto
 * Ignora pedidos com status "concluido"
 */
export const consolidarItensPedidos = (
  pedidos: PedidoFechamento[]
): ItemConsolidado[] => {
  const itensMap = new Map<number, ItemConsolidado>();

  // Filtra pedidos concluídos antes de processar
  const pedidosNaoConcluidos = pedidos.filter(
    (pedido) => pedido.status !== "concluido"
  );

  pedidosNaoConcluidos.forEach((pedido) => {
    pedido.itens.forEach((item) => {
      const produtoId = item.produtoId;

      if (itensMap.has(produtoId)) {
        const itemExistente = itensMap.get(produtoId)!;
        itemExistente.quantidadeTotal += item.quantidade;
        itemExistente.subtotal += item.subtotal;
        itemExistente.pedidos.push(pedido.pedidoId);

        // Adiciona observações únicas
        if (
          item.observacoes &&
          !itemExistente.observacoes.includes(item.observacoes)
        ) {
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
          pedidos: [pedido.pedidoId],
        });
      }
    });
  });

  return Array.from(itensMap.values()).sort((a, b) =>
    a.nome.localeCompare(b.nome)
  );
};

/**
 * Gera resumo financeiro completo de uma mesa
 * Ignora pedidos com status "concluido"
 */
export const gerarResumoFinanceiro = async (
  mesaId: number
): Promise<ResumoFinanceiroMesa> => {
  try {
    // Busca informações da mesa
    const mesaResponse = await api.get(
      `${API_ENDPOINTS.MESAS}/${mesaId}/status`
    );
    const mesa = mesaResponse.data;

    // Busca todos os pedidos da mesa
    const todosPedidos = await getPedidosMesa(mesaId);

    // Filtra pedidos concluídos - não devem ser considerados no fechamento
    const pedidos = todosPedidos.filter(
      (pedido) => pedido.status !== "concluido"
    );

    // Consolida itens por produto (já filtra concluídos internamente)
    const itensConsolidados = consolidarItensPedidos(pedidos);

    // Calcula totais apenas com pedidos não concluídos
    const subtotal = pedidos.reduce(
      (total, pedido) => total + pedido.valorTotal,
      0
    );

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
      tempoTotal: undefined, // API não retorna tempo de ocupação
    };
  } catch (error) {
    console.error(`Erro ao gerar resumo financeiro da mesa ${mesaId}:`, error);
    throw error;
  }
};

/**
 * Atualiza status de um pedido usando status_id (nova API)
 * @param pedidoId ID do pedido a ser atualizado
 * @param statusId ID do novo status (1-4)
 * @param statusAtual Status atual do pedido (opcional, para validação)
 * @returns Promise com a resposta da API contendo status e status_id
 */
export const atualizarStatusPedido = async (
  pedidoId: number,
  statusId: number,
  statusAtual?: string
): Promise<PedidoStatusUpdateResponse> => {
  try {
    // Validar se status_id está no range válido (1-4)
    if (!STATUS_ID_TO_STRING[statusId]) {
      throw new Error(
        `Status ID inválido: ${statusId}. Valores válidos: 1 (Pendente), 2 (Em preparo), 3 (Entregue), 4 (Concluído)`
      );
    }

    const novoStatus = STATUS_ID_TO_STRING[statusId];

    // Validar se não está tentando definir o mesmo status
    if (statusAtual && statusAtual.toLowerCase() === novoStatus.toLowerCase()) {
      throw new Error(
        `O pedido já está como "${getDisplayText(
          novoStatus
        )}". Não é possível definir o mesmo status novamente.`
      );
    }

    const response = await api.patch(
      `${API_ENDPOINTS.PEDIDOS}/${pedidoId}/status`,
      {
        status_id: statusId,
      } as PedidoStatusUpdateRequest
    );

    return response.data;
  } catch (error) {
    console.error(`Erro ao atualizar status do pedido ${pedidoId}:`, error);
    throw error;
  }
};

/**
 * Obtém o texto de exibição com primeira letra maiúscula e acentos corretos
 */
export const getDisplayText = (status: string): string => {
  const displayTexts: Record<string, string> = {
    pendente: "Pendente",
    "em preparo": "Em preparo",
    entregue: "Entregue",
    concluido: "Concluído",
  };

  return displayTexts[status.toLowerCase()] || status;
};

/**
 * Converte string de status para status_id usando o mapeamento das constantes
 */
export const getStatusIdFromString = (status: string): number => {
  return STATUS_STRING_TO_ID[status.toLowerCase()] || 1;
};

/**
 * Obtém a string de status a partir do status_id usando o mapeamento das constantes
 */
export const getStringFromStatusId = (statusId: number): string => {
  return STATUS_ID_TO_STRING[statusId] || "pendente";
};

/**
 * Atualiza status por string (converte para status_id internamente)
 */
export const atualizarStatusPedidoPorString = async (
  pedidoId: number,
  statusString: string
): Promise<PedidoStatusUpdateResponse> => {
  const statusId = getStatusIdFromString(statusString);
  return atualizarStatusPedido(pedidoId, statusId);
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
 * Fecha a conta de uma mesa usando o endpoint correto da API
 */
export const fecharContaMesa = async (
  mesaId: number,
  dadosFechamento: FecharMesaRequest = {}
): Promise<FecharMesaResponse> => {
  try {
    // Usa o endpoint de fechamento da API atualizado
    const response = await api.post(
      `${API_ENDPOINTS.MESAS}/${mesaId}/encerrar`,
      {
        metodo_pagamento: dadosFechamento.metodo_pagamento || "dinheiro",
        // A API pode não suportar estes campos, removendo por enquanto
        // desconto: dadosFechamento.desconto || 0,
        // taxaServico: dadosFechamento.taxaServico || 0,
        // observacoes: dadosFechamento.observacoes || ''
      }
    );

    return {
      mesaId,
      valorTotal: response.data.valorTotal || 0,
      status: "fechada",
      timestamp: new Date().toISOString(),
      metodo_pagamento: dadosFechamento.metodo_pagamento,
      desconto: dadosFechamento.desconto,
      taxaServico: dadosFechamento.taxaServico,
    };
  } catch (error) {
    console.error(`Erro ao fechar conta da mesa ${mesaId}:`, error);
    throw error;
  }
};

/**
 * Valida se uma mesa pode ser fechada
 * Ignora pedidos concluídos na validação
 */
export const validarFechamentoMesa = async (
  mesaId: number
): Promise<{
  podeFechar: boolean;
  motivo?: string;
  pedidosPendentes: number;
}> => {
  try {
    const todosPedidos = await getPedidosMesa(mesaId);

    // Filtra pedidos concluídos - não devem ser considerados
    const pedidosNaoConcluidos = todosPedidos.filter(
      (p) => p.status !== "concluido"
    );

    const pedidosPendentes = pedidosNaoConcluidos.filter(
      (p) => p.status === "pendente" || p.status === "em preparo"
    );

    const podeFechar = pedidosPendentes.length === 0;

    return {
      podeFechar,
      motivo: !podeFechar
        ? `Existem ${pedidosPendentes.length} pedido(s) ainda em preparo`
        : undefined,
      pedidosPendentes: pedidosPendentes.length,
    };
  } catch (error) {
    console.error(`Erro ao validar fechamento da mesa ${mesaId}:`, error);
    return {
      podeFechar: false,
      motivo: "Erro ao validar mesa",
      pedidosPendentes: 0,
    };
  }
};

// === FUNÇÕES PARA SISTEMA DE CHAMADAS (NOVA API) ===

/**
 * Lista todas as chamadas de serviço
 */
export const listarChamadasServico = async (): Promise<ChamadaServico[]> => {
  try {
    const response = await api.get("/chamadas");
    return response.data;
  } catch (error) {
    console.error("Erro ao listar chamadas de serviço:", error);
    throw error;
  }
};

/**
 * Cria uma nova chamada de serviço
 */
export const criarChamadaServico = async (
  dadosChamada: CriarChamadaRequest
): Promise<ChamadaServico> => {
  try {
    const response = await api.post("/chamadas", dadosChamada);
    return response.data;
  } catch (error) {
    console.error("Erro ao criar chamada de serviço:", error);
    throw error;
  }
};

/**
 * Atualiza o status de uma chamada de serviço
 */
export const atualizarChamadaServico = async (
  chamadaId: number,
  novoStatus: "pendente" | "atendida" | "cancelada"
): Promise<ChamadaServico> => {
  try {
    const response = await api.put(`/chamadas/${chamadaId}`, {
      status: novoStatus,
    });
    return response.data;
  } catch (error) {
    console.error(`Erro ao atualizar chamada ${chamadaId}:`, error);
    throw error;
  }
};

/**
 * Remove uma chamada de serviço
 */
export const removerChamadaServico = async (
  chamadaId: number
): Promise<void> => {
  try {
    await api.delete(`/chamadas/${chamadaId}`);
  } catch (error) {
    console.error(`Erro ao remover chamada ${chamadaId}:`, error);
    throw error;
  }
};
