// Tipos centralizados para operações de services

// Produto Services
export interface ProdutoCreate {
  nome: string;
  descricao?: string;
  preco: number;
  categoriaId: number;
  imagem?: string | File;
  popular?: boolean;
  tempoPreparo?: number;
  restricoes?: string[];
}

// Categoria Services
export interface CategoriaCreate {
  nome: string;
  descricao?: string;
  imagemUrl?: string | File;
  ordem?: number;
}

export interface CategoriaUpdate {
  nome?: string;
  descricao?: string;
  imagemUrl?: string | File;
  ordem?: number;
}

// Upload Services
export interface UploadResponse {
  url: string;
  filename: string;
}

// Context Types
export interface CarrinhoContextType {
  items: import("@/src/types").ItemCarrinho[];
  totalItems: number;
  totalValor: number;
  adicionarItem: (item: import("@/src/types").ItemCarrinho) => void;
  removerItem: (id: string) => void;
  atualizarQuantidade: (id: string, quantidade: number) => void;
  limparCarrinho: () => void;
}

// API Response Types
export interface ApiError {
  message: string;
  status: number;
  code?: string;
}

// Common Service Response
export interface ServiceResponse<T> {
  data?: T;
  error?: ApiError;
  success: boolean;
}