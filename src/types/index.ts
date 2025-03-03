export interface Produto {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  categoria: string;
  imagem: string;
  popular?: boolean;
  tempoPreparo?: number;
  restricoes?: string[];
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
  status: "confirmado" | "em-preparo" | "entregue";
  mesa: string;
}

export interface ItemDivisao extends ItemCarrinho {
  pessoas: number[];
}

export type CategoriaProduto =
  | "todos"
  | "entradas"
  | "principais"
  | "bebidas"
  | "sobremesas";

export interface Mesa {
  numero: string;
  status: "livre" | "ocupada" | "reservada" | "manutencao";
  pedidosEmAberto: number;
  ultimaAtualizacao: number;
}

export interface Admin {
  id: string;
  nome: string;
  email: string;
  cargo: "gerente" | "garcom" | "cozinheiro";
  permissoes: string[];
}
