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
  valorTotal: number;
  estimativaEntrega: string;
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

// Request para fechar mesa
export interface FecharMesaRequest {
  formaPagamento?: string;
  desconto?: number;
  taxaServico?: number;
  observacoes?: string;
}

// Response do fechamento
export interface FecharMesaResponse {
  mesaId: number;
  valorTotal: number;
  status: string;
  timestamp: string;
  formaPagamento?: string;
  desconto?: number;
  taxaServico?: number;
}

// Status dos pedidos para filtros
export type StatusPedidoFechamento = 
  | 'todos'
  | 'confirmado' 
  | 'preparando' 
  | 'pronto' 
  | 'entregue'
  | 'cancelado';

// Filtros para a página de fechamento
export interface FiltrosFechamento {
  status: StatusMesa | 'todas';
  valorMinimo?: number;
  valorMaximo?: number;
  tempoMinimo?: number; // em horas
  busca?: string;
}