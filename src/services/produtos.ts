import api from "./api";
import { API_ENDPOINTS } from "@/src/constants";
import type { Produto } from "@/src/types";
import {
  mapearProdutoAPI,
  mapearProdutosAPI,
} from "@/src/adapters/produtoAdapter";

/**
 * Busca produtos de uma categoria específica
 */
export const getProdutosPorCategoria = async (
  categoriaId: number
): Promise<Produto[]> => {
  try {
    const response = await api.get(
      `${API_ENDPOINTS.CATEGORIAS}/${categoriaId}/produtos`
    );
    return mapearProdutosAPI(response.data);
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
  categoriaId,
  vegetariano,
  semGluten,
}: {
  categoriaId: number | 0; // agora aceita ID ou "todos"
  vegetariano: boolean;
  semGluten: boolean;
}): Promise<Produto[]> => {
  try {
    let produtos: Produto[] = [];

    produtos = await getProdutosPorCategoria(categoriaId);

    // Aplicar filtros no client-side (a API não tem endpoint específico para isso)
    return produtos.filter((produto) => {
      if (
        vegetariano &&
        (!produto.restricoes || !produto.restricoes.includes("vegetariano"))
      ) {
        return false;
      }
      if (
        semGluten &&
        (!produto.restricoes || !produto.restricoes.includes("sem gluten"))
      ) {
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
    const response = await api.get(
      `${API_ENDPOINTS.PRODUTOS}/recomendados?limite=${limite}`
    );
    return mapearProdutosAPI(response.data);
  } catch (error) {
    console.error("Erro ao buscar produtos recomendados:", error);
    return [];
  }
};
