export interface Produto {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  categoria: string;
  imagem: string;
  disponivel: boolean;
  popular?: boolean;
  tempoPreparo?: number;
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
  status: "confirmado" | "preparando" | "entregue";
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
  estimativaEntrega: string;
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
export type StatusPedido = "confirmado" | "preparando" | "pronto" | "entregue";

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
  mesaId: number;
  mesaNome: string;
  timestamp: string;
  status: string;
  observacoesGerais: string | null;
  estimativaEntrega: string;
  itens: ItemPedidoProducao[];
}

// Theme customization types
export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  destructive: string;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  input: string;
  ring: string;
  radius: string;
}

export interface CustomTheme {
  id?: string;
  name: string;
  light: ThemeColors;
  dark: ThemeColors;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ThemePreset {
  name: string;
  description: string;
  preview: {
    primary: string;
    secondary: string;
    background: string;
  };
  theme: Omit<CustomTheme, 'id' | 'isActive' | 'createdAt' | 'updatedAt'>;
}

// Re-export auth types
export * from "./auth";
