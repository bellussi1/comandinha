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
}

export interface ItemDivisao extends ItemCarrinho {
  pessoas: number[];
}
