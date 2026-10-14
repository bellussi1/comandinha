import type { Produto } from "@/src/types";

/**
 * Mapeia um produto da API para o formato usado na aplicação
 */
export function mapearProdutoAPI(produtoAPI: any): Produto {
  return {
    id: produtoAPI.id.toString(),
    nome: produtoAPI.nome,
    descricao: produtoAPI.descricao || "",
    preco: produtoAPI.preco,
    categoria: produtoAPI.categoriaId 
      ? produtoAPI.categoriaId.toString() 
      : "outros",
    // O campo imagemUrl da API é mapeado para o campo imagem usado na aplicação
    imagem: produtoAPI.imagemUrl || "/placeholder.svg",
    disponivel: produtoAPI.disponivel !== undefined ? produtoAPI.disponivel : true,
    popular: produtoAPI.popular || false,
    tempoPreparo: produtoAPI.tempoPreparoMinutos || 15,
    restricoes: produtoAPI.restricoes || [],
  };
}

/**
 * Mapeia uma lista de produtos da API
 */
export function mapearProdutosAPI(produtosAPI: any[]): Produto[] {
  return produtosAPI.map(mapearProdutoAPI);
} 