export interface Produto {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  categoria: string;
  imagem: string;
  disponivel: boolean;
  popular?: boolean;
  tempoPreparo?: number; // Mantido para compatibilidade com API, mas não exibido no frontend
  restricoes?: string[];
}

export interface Categoria {
  id: number;
  nome: string;
  descricao?: string;
  imagemUrl?: string;
  ordem: number;
}

export interface ItemCarrinho extends Produto {
  quantidade: number;
  observacoes?: string;
  adicionais?: Array<{ nome: string; preco: number }>;
}

export interface Pedido {
  id: string;
  itens: ItemCarrinho[];
  timestamp: number;
  status: "pendente" | "em preparo" | "entregue" | "concluido";
  mesa: string;
  observacoesGerais?: string;
}

export interface ItemDivisao extends ItemCarrinho {
  pessoas: number[];
}

export interface Mesa {
  id: number;
  nome: string;
  status: "livre" | "ocupada" | "reservada" | "manutencao";
}

export interface MesaAdmin {
  id: number;
  uuid: string;
  nome: string;
  status: "disponivel" | "em_uso";
  criadaEm?: string;
  atualizadaEm?: string;
}

export interface MesaCriacaoRequest {
  nome: string;
}

export interface MesaCriacaoResponse {
  id: number;
  uuid: string;
  nome: string;
  status?: string | null;
  status_id?: number | null;
}

export interface MesaStatusUpdate {
  status: "disponivel" | "em_uso";
}

// Novos tipos baseados na API OpenAPI
export interface MesaListResponse {
  id: number;
  uuid: string;
  nome: string;
  status: string;
  status_id: number;
}

// Request para fechamento de mesa (novo endpoint /encerrar)
export interface MesaFechamentoRequest {
  metodo_pagamento?: string | null;
}

export interface Admin {
  id: string;
  nome: string;
  email: string;
  cargo: "gerente" | "garcom" | "cozinheiro";
  permissoes: string[];
}

// Novos tipos para a API
export interface MesaAtivacao {
  token: string;
  expiraEm: string;
  mesaId: string;
  mesaNome: string;
}

export interface PedidoAPI {
  pedidoId: number;
  timestamp: string;
  status: string;
  itens: ItemPedidoAPI[];
  valorTotal: number;
  estimativaEntrega: string; // Mantido para compatibilidade com API, mas não exibido no frontend
  observacoesGerais?: string | null;
}

export interface ItemPedidoAPI {
  produtoId: number;
  nome: string;
  quantidade: number;
  precoUnitario: number;
  observacoes?: string | null;
  subtotal: number;
}

// Definição dos status possíveis para um pedido
export type StatusPedido = "pendente" | "em preparo" | "entregue" | "concluido";

// Adicionais no pedido em produção
export interface AdicionalProducao {
  id: string;
  nome: string;
  preco: number;
}

// Item de pedido em produção
export interface ItemPedidoProducao {
  produtoNome: string;
  produtoDescricao: string | null;
  produtoAdicionais: AdicionalProducao[] | null;
  quantidade: number;
  observacoes: string | null;
}

// Pedido em produção
export interface PedidoProducao {
  pedidoId: number;
  mesaId?: number; // Mantido para compatibilidade
  mesaUuid: string; // Novo campo UUID
  mesaNome: string;
  timestamp: string;
  status: string;
  observacoesGerais: string | null;
  estimativaEntrega: string; // Mantido para compatibilidade com API, mas não exibido no frontend
  itens: ItemPedidoProducao[];
}

// Tipos para Chamados
export interface Chamado {
  id: number;
  mesaUuid: string;
  mesaNome?: string;
  status: "pendente" | "atendido" | "cancelado";
  criadoEm: string;
  atualizadoEm?: string;
}

export interface CriarChamadoRequest {
  mesa_uuid: string;
}

export interface ChamadoResponse {
  id: number;
  mesa_uuid: string;
  status: string;
  criado_em: string;
  atualizado_em?: string;
}

// Re-export auth types
export * from "./auth";

// Re-export fechamento types
export * from "./fechamento";
