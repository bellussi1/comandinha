import api from "./api";
import { API_ENDPOINTS } from "@/src/constants";
import type { Produto, CategoriaProduto } from "@/src/types";
import { mapearProdutoAPI, mapearProdutosAPI } from "@/src/adapters/produtoAdapter";

/**
 * Busca produtos de uma categoria específica
 */
export const getProdutosPorCategoria = async (
  categoria: CategoriaProduto
): Promise<Produto[]> => {
  try {
    if (categoria === "todos") {
      const response = await api.get(API_ENDPOINTS.PRODUTOS);
      console.log("API Response (todos):", response.data);
      const produtos = mapearProdutosAPI(response.data);
      console.log("Produtos mapeados:", produtos);
      return produtos;
    } else {
      // Primeiro precisamos obter o ID da categoria
      const categorias = await api.get(`${API_ENDPOINTS.CATEGORIAS}/`);
      const categoriaObj = categorias.data.find(
        (cat: any) => cat.nome.toLowerCase() === categoria.toLowerCase()
      );

      if (!categoriaObj) return [];

      const response = await api.get(`${API_ENDPOINTS.CATEGORIAS}/${categoriaObj.id}/produtos`);
      console.log(`API Response (${categoria}):`, response.data);
      const produtos = mapearProdutosAPI(response.data);
      console.log("Produtos mapeados:", produtos);
      return produtos;
    }
  } catch (error) {
    console.error("Erro ao buscar produtos por categoria:", error);
    return [];
  }
};

/**
 * Busca um produto pelo ID
 */
export const getProdutoById = async (id: string): Promise<Produto | null> => {
  try {
    const response = await api.get(`${API_ENDPOINTS.PRODUTOS}/${id}`);
    return mapearProdutoAPI(response.data);
  } catch (error) {
    console.error("Erro ao buscar produto por ID:", error);
    return null;
  }
};

/**
 * Filtra produtos com base em diversos critérios
 */
export const filtrarProdutos = async ({
  categoria,
  vegetariano,
  semGluten,
}: {
  categoria: CategoriaProduto;
  vegetariano: boolean;
  semGluten: boolean;
}): Promise<Produto[]> => {
  try {
    // Buscar produtos por categoria
    const produtos = await getProdutosPorCategoria(categoria);

    // Aplicar filtros no client-side (a API não tem endpoint específico para esses filtros)
    return produtos.filter(produto => {
      if (vegetariano && (!produto.restricoes || !produto.restricoes.includes("vegetariano"))) {
        return false;
      }
      if (semGluten && (!produto.restricoes || !produto.restricoes.includes("sem-gluten"))) {
        return false;
      }
      return true;
    });
  } catch (error) {
    console.error("Erro ao filtrar produtos:", error);
    return [];
  }
};

/**
 * Busca produtos recomendados
 */
export const getProdutosRecomendados = async (
  limite: number = 5
): Promise<Produto[]> => {
  try {
    const response = await api.get(`${API_ENDPOINTS.PRODUTOS}/recomendados?limite=${limite}`);
    return mapearProdutosAPI(response.data);
  } catch (error) {
    console.error("Erro ao buscar produtos recomendados:", error);
    return [];
  }
};
