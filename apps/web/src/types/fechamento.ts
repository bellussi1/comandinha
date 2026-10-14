// Tipos específicos para sistema de fechamento de contas

export type StatusMesa = 'livre' | 'em uso' | 'expirada' ;

export interface MesaFechamento {
  id: number;
  nome: string;
  status: StatusMesa;
  tempoOcupacao?: number; // em minutos
  totalPedidos: number;
  valorTotal: number;
  ultimaAtividade: string;
  pedidosAtivos: number;
}

export interface PedidoFechamento {
  pedidoId: number;
  mesaId: number;
  timestamp: string;
  status: string;
  status_id: number;
  valorTotal: number;
  estimativaEntrega: string; // Mantido para compatibilidade com API, mas não exibido no frontend
  observacoesGerais?: string | null;
  itens: ItemPedidoFechamento[];
}

export interface ItemPedidoFechamento {
  produtoId: number;
  nome: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
  observacoes?: string | null;
}

// Consolidação de itens por produto
export interface ItemConsolidado {
  produtoId: number;
  nome: string;
  precoUnitario: number;
  quantidadeTotal: number;
  subtotal: number;
  observacoes: string[];
  pedidos: number[]; // IDs dos pedidos que contêm este item
}

// Resumo financeiro da mesa
export interface ResumoFinanceiroMesa {
  mesaId: number;
  mesaNome: string;
  pedidos: PedidoFechamento[];
  itensConsolidados: ItemConsolidado[];
  subtotal: number;
  desconto: number;
  taxaServico: number;
  totalFinal: number;
  inicioOcupacao?: string;
  tempoTotal?: number; // em minutos
}

// Request para fechar mesa (alinhado com API)
export interface FecharMesaRequest {
  metodo_pagamento?: string;
  desconto?: number;
  taxaServico?: number;
  observacoes?: string;
}

// Response do fechamento (alinhado com API)
export interface FecharMesaResponse {
  mesaId: number;
  valorTotal: number;
  status: string;
  timestamp: string;
  metodo_pagamento?: string;
  desconto?: number;
  taxaServico?: number;
}

// Status dos pedidos para filtros
export type StatusPedidoFechamento =
  | 'todos'
  | 'pendente'
  | 'em preparo'
  | 'entregue'
  | 'concluido'
  | 'cancelado';

// Mapeamento de status_id para status (baseado na nova API)
export const STATUS_PEDIDO_MAP: Record<number, string> = {
  1: 'pendente',
  2: 'em preparo',
  3: 'entregue',
  4: 'concluido'
};

// Request para atualizar status do pedido (nova API)
export interface PedidoStatusUpdateRequest {
  status_id: number; // 1-4
}

// Response da atualização de status (nova API)
export interface PedidoStatusUpdateResponse {
  status: string;
  status_id: number;
}

// Filtros para a página de fechamento
export interface FiltrosFechamento {
  status: StatusMesa | 'todas';
  valorMinimo?: number;
  valorMaximo?: number;
  tempoMinimo?: number; // em horas
  busca?: string;
  dataInicio?: string; // ISO 8601 format
  dataFim?: string; // ISO 8601 format
}

// Filtros para pedidos (suportados pela nova API)
export interface FiltrosPedidos {
  status?: string; // pode ser múltiplos separados por vírgula: "pendente,preparo"
  desde?: string; // ISO 8601 datetime
}

// Tipos para sistema de chamadas (disponível na nova API)
export interface ChamadaServico {
  id: number;
  mesa_id: number;
  tipo: 'assistencia' | 'fechar_conta' | 'urgente';
  status: 'pendente' | 'atendida' | 'cancelada';
  mensagem?: string;
  criada_em: string;
  atendida_em?: string;
}

// Request para criar chamada de serviço
export interface CriarChamadaRequest {
  mesa_id: number;
  tipo: 'assistencia' | 'fechar_conta' | 'urgente';
  mensagem?: string;
}